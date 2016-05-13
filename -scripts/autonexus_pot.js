// autonexus_pot.js

var ID_MOVE = $.findPacketId("MOVE");
var ID_PLAYERHIT = $.findPacketId("PLAYERHIT");
var ID_SHOOT = $.findPacketId("SHOOT");
var ID_SHOOT2 = $.findPacketId("SHOOT2");
var ID_UPDATE = $.findPacketId("UPDATE");
var ID_CREATE_SUCCESS = $.findPacketId("CREATE_SUCCESS");
var ID_NEW_TICK = $.findPacketId("NEW_TICK");
var ID_AOE = $.findPacketId("AOE");
var ID_ESCAPE = $.findPacketId("ESCAPE");
var ID_USE_ITEM = $.findPacketId("USEITEM");
var ID_NOTIFICATION = $.findPacketId("NOTIFICATION");
var ID_MAPINFO = $.findPacketId("MAPINFO");

var STATDATA_MAXHEALTH = 0;
var STATDATA_HEALTH = 1;
var STATDATA_DEFENCEBONUS = 49

var nexusHealthPercentage = 25; // <--- modify this to the health % you want to nexus at
var playerObjectId = -1;
var _allowAutoNexus = true;  // <--- set to false if you do not want it to auto nexus

var health = -1;
var maxHealth = -1;
var defenceBonus = -1;
var bulletIdDamageMap = {};
var bEscapeToNexusSent = false; // true = don't confirm any more hits
var playerLocation = null;

// zekikez - auto health potion
var SLOTDATA_HEALTHPOT = 69;
var TIMEOUT_OFFSET = 250; // the amount of time before allowing to use the health potion again

var _potHealthPercentage = 35; // <--- modify this to the health % you want to pot at

var _clientTime = 0;
var _potHealthCount = 0;
var _skipHealthPotion = true;
var _timeoutAt = -1; 
var _mapName = "Nexus";

function onClientPacket(event) {
   if (bEscapeToNexusSent) {
      event.cancel();
      return;
   }
   var packet = event.getPacket();
   if (packet.time)
   {
      _clientTime = packet.time;
      if (_skipHealthPotion && _timeoutAt < _clientTime)
         _skipHealthPotion = false;
   }
   switch (packet.id()) {
      case ID_MOVE: {
         playerLocation = packet.newPosition;
         break;
      }
      case ID_PLAYERHIT: {
         // predict what the damage will be
         health -= getDamageEstimate(bulletIdDamageMap[packet.bulletId]);
         if (_mapName != "Nexus" && useBestEscape())
               event.cancel();
         break;
      }
   }
}

function onServerPacket(event) {
   var packet = event.getPacket();
   switch (packet.id()) {
      case ID_MAPINFO: {
         _mapName = packet.name;
		$.echo(_mapName);
         break;
      }   
      case ID_SHOOT2:
      case ID_SHOOT: {
         // store projectile damage...
         bulletIdDamageMap[packet.bulletId] = packet.damage;
         break;
      }
      case ID_UPDATE: {
         for (var i = 0; i < packet.newObjs.length; i++) {
            var objectData = packet.newObjs[i];
            if (objectData.status.objectId == playerObjectId) {
               for (var j = 0; j < objectData.status.data.length; j++) {
                  var statData = objectData.status.data[j];
                  // update player data...
                  if (statData.obf0 == STATDATA_MAXHEALTH) {
                     maxHealth = statData.obf1;
                  } else if (statData.obf0 == STATDATA_HEALTH) {
                     health = statData.obf1;
                  } else if (statData.obf0 == STATDATA_DEFENCEBONUS) {
                     defenceBonus = statData.obf1;
                  } else if (statData.obf0 == SLOTDATA_HEALTHPOT) {
                     _potHealthCount = statData.obf1;
                  }
               }
            }
         }
         break;
      }
      case ID_CREATE_SUCCESS: {
         // keep the player's objectId
         playerObjectId = packet.objectId;
         break;
      }
      case ID_NEW_TICK: {
         for (var i = 0; i < packet.statuses.length; i++) {
            var status = packet.statuses[i];
            if (status.objectId == playerObjectId) {
               for (var j = 0; j < status.data.length; j++) {
                  var statData = status.data[j];
                  // update the player's health
                  if (statData.obf0 == STATDATA_HEALTH) {
                     health = statData.obf1;
                  } else if (statData.obf0 == STATDATA_DEFENCEBONUS) {
                     defenceBonus = statData.obf1;
                  } else if (statData.obf0 == SLOTDATA_HEALTHPOT) {
                     _potHealthCount = statData.obf1;
                     $.echo("health pot count: " + _potHealthCount);
                  }
               }
            }
         }
         break;
      }
      case ID_AOE: {
         if (playerLocation != null && playerLocation.distanceTo(packet.pos) <= packet.radius) {
            // predict what the damage will be
            health -= getDamageEstimate(packet.damage);
            if (_mapName != "Nexus" && useBestEscape())
               event.cancel();
         }
         break;
      }
   }
}

function getDamageEstimate(baseDamage) {
        // not a perfect damage calculation at all, but good enough for govt work
        var damage = baseDamage - defenceBonus;
        if (damage < 0.15 * baseDamage) {
         damage = 0.15 * baseDamage;
        }
        if (isNaN(damage)) {
         // return 100; 
         return 0; // if damage is undefined then just wait for next tick to health update.
        }
        return damage;
}


// Determines best action based on current health percentage
// returns true if an action happens 
function useBestEscape() {
   // if the predicted health percentage is below nexusHealthPercentage...
   var curPercentage = 100 * health / maxHealth;
   //$.echo("Current Health: " + health + " / " + maxHealth + " = "  + curPercentage);
   if (_allowAutoNexus && curPercentage <= nexusHealthPercentage) {
      useNexus();
      return true;
   }
   else if (!_skipHealthPotion && _potHealthCount > 0 && curPercentage <= _potHealthPercentage) {
      useHealthPotion();
      return true;
   }
   return false;
}

// creates ESCAPE packet and sends to server
function useNexus() {
   $.echo("Used Nexus");
   var escapePacket = $.createPacket(ID_ESCAPE);
   $.sendToServer(escapePacket);
   bEscapeToNexusSent = true; // this prevents any additional packets from being sent
}

// creates a USE_ITEM packet with the health potion details
function useHealthPotion() {
   $.echo("Used Health Potion");
   var useitemPacket = $.createPacket(ID_USE_ITEM);
   useitemPacket.time = _clientTime + 50; // ? not sure if increment is needed
   useitemPacket.slotObject = $.createSlotObject();
   useitemPacket.slotObject.objectType = 2594; // health potion type
   useitemPacket.slotObject.slotId = 254; // health potion slotid
   useitemPacket.slotObject.objectId = playerObjectId; // player id
   useitemPacket.itemUsePos = playerLocation; // should randomly offset a bit. (this should be where the cursor is pointing)
   useitemPacket.useType = 0;
   $.sendToServer(useitemPacket);
   // Notify user that a potion was used and show the remaining number of pots
   autoNexusPot_Notify("Used Health Potion! Count: " + _potHealthCount - 1);
   _skipHealthPotion = true;
   _timeoutAt = _clientTime + TIMEOUT_OFFSET;
}

function autoNexusPot_Notify(text) {
   var notificationPacket = $.createPacket(ID_NOTIFICATION);
   notificationPacket.objectId = playerObjectId;
   notificationPacket.message = "{\"key\":\"blank\",\"tokens\":{\"data\":\"" + text + "\"}}";
   notificationPacket.color = 0x33FFFF;;
   $.sendToClient(notificationPacket);
}