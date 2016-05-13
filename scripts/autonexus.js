// autonexus.js

var ID_AOE = $.findPacketId("AOE");
var ID_CREATE_SUCCESS = $.findPacketId("CREATE_SUCCESS");
//Var ID_DAMAGE = $.findPacketId("DAMAGE");
var ID_ESCAPE = $.findPacketId("ESCAPE");
//var ID_MAPINFO = $.findPacketId("MAPINFO");
var ID_MOVE = $.findPacketId("MOVE");
var ID_NEW_TICK = $.findPacketId("NEW_TICK");
var ID_PLAYER_HIT = $.findPacketId("PLAYERHIT");
var ID_SHOOT = $.findPacketId("SHOOT");
var ID_SHOOT2 = $.findPacketId("SHOOT2");
var ID_SHOOTACK = $.findPacketId("SHOOTACK");
var ID_UPDATE = $.findPacketId("UPDATE");
var ID_USE_ITEM = $.findPacketId("USEITEM");
//var ID_USEPORTAL = $.findPacketId("USEPORTAL");

var nexusHealthPercentage = 20;  
var nexusTakenHitsLeft = 1;
var nexusConsecHits = 4;
var bulletUpdateTicks = 30;
var _potHealthPercentage = 30;

var playerObjectId = -1;
var health = -1;
var maxHealth = -1;
var defenceBonus = -1;
var bulletIdDamageMap = {};
var bulletIdTickMap = {};
var bEscapeToNexusSent = false; // true = don't confirm any more hits
var playerLocation = null;
var maxDamage = 0;
var counterHit = 0;
var counterHitZero = 0;
var usedHealthPotion = false;

var SLOTDATA_HEALTHPOT = 69;
var TIMEOUT_OFFSET = 250; // the amount of time before allowing to use the health potion again

var _clientTime = 0;
var _potHealthCount = 0;
var _skipHealthPotion = true;
var _timeoutAt = -1; 

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
		case ID_MOVE: { // MOVE
			playerLocation = packet.newPosition;
			break;
		}
		case ID_PLAYER_HIT: { // PLAYERHIT
			_skipHealthPotion = true;
			if (isNaN(bulletIdDamageMap[packet.bulletId]))
			{
				health -= maxDamage / 2;
				$.echo(">>>>HITWARNING Nan damage");
			}
			else {
				health -= getDamageEstimate(bulletIdDamageMap[packet.bulletId]);
				if (bulletIdTickMap[packet.bulletId] == 0)
					$.echo(">>>>HITWARNING t0 ID = " +packet.bulletId+" DamageMap = " + bulletIdDamageMap[packet.bulletId] + " TickMap = " + bulletIdTickMap[packet.bulletId]);
					
			}
			if (usedHealthPotion)
			{
				$.echo("used health potion, health before = " + health);
				health+=100;
				$.echo("used health potion, health after = " + health);
				usedHealthPotion = false;
			}
			$.echo("PLAYERHIT: Hit Number " + ++counterHit + ": health(estimated) = " + health);
			if (bulletIdDamageMap[packet.bulletId] == 0)
			{
				counterHitZero++;
				$.echo(">>>>HITWARNING d0 ID = " +packet.bulletId+" DamageMap = " + bulletIdDamageMap[packet.bulletId] + " TickMap = " + bulletIdTickMap[packet.bulletId]);
			}
			if (counterHitZero >= nexusConsecHits) {
				$.echo("Consecutive Zero Hit escape");
				useNexus();
			}
			if (useBestEscape(maxDamage)) {
				$.echo("Hit escape");
				event.cancel();
			}
			break;
		}
	}
}

function onServerPacket(event) {
	var packet = event.getPacket();
	switch (packet.id()) {
		case ID_SHOOT: { // SHOOT
			bulletIdDamageMap[packet.bulletId] = packet.damage;
			bulletIdTickMap[packet.bulletId] = bulletUpdateTicks;
			maxDamage = getDamageBulletMost();
			// if (maxDamage != 0)
				// $.echo("MaxDamage =" + maxDamage);
			updateBullet();
			break;
		}
		case ID_UPDATE: { // UPDATE
			for (var i = 0; i < packet.newObjs.length; i++) {
				var objectData = packet.newObjs[i];
				if (objectData.status.objectId == playerObjectId) {
					for (var j = 0; j < objectData.status.data.length; j++) {
						var statData = objectData.status.data[j];
						if (statData.obf0 == 0) {
							maxHealth = statData.obf1;
						} else if (statData.obf0 == 1) {
							health = statData.obf1;
						} else if (statData.obf0 == 49) {
							defenceBonus = statData.obf1;
						} else if (statData.obf0 == SLOTDATA_HEALTHPOT) {
						   _potHealthCount = statData.obf1;
					    }
					}
				}
			}
			break;
		}
		case ID_CREATE_SUCCESS: { // CREATE_SUCCESS
			playerObjectId = packet.objectId;
			break;
		}
		case ID_NEW_TICK: { // NEW_TICK
			//$.echo("isempty bullet = " + isEmpty(bulletIdDamageMap).toString());
			//$.echo("bEscapeToNexusSent = " + bEscapeToNexusSent.toString());
			//$.echo("Tick =" + counter++);
			counterHit = 0;
			counterHitZero = 0;
			
			for (var i = 0; i < packet.statuses.length; i++) {
				var status = packet.statuses[i];
				if (status.objectId == playerObjectId) {
					for (var j = 0; j < status.data.length; j++) {
						var statData = status.data[j];
						if (statData.obf0 == 1) {
							health = statData.obf1;
						} else if (statData.obf0 == 0) {
							maxHealth = statData.obf1;
						} else if (statData.obf0 == 49) {
							defenceBonus = statData.obf1;
						} 
						else if (statData.obf0 == SLOTDATA_HEALTHPOT) {
							_potHealthCount = statData.obf1;
							$.echo("health pot count: " + _potHealthCount);
						}
					}
				}
			}
			
			if (health != maxHealth) {
				$.echo("TICK: Health(actual) =" + health);
			}
			
			if (useBestEscape(maxDamage)) {
				$.echo("Tick escape");
				event.cancel();
			}
			break;
		}
		case ID_AOE: { // AOE
			if (playerLocation != null && playerLocation.distanceTo(packet.pos) <= packet.radius) {
				if (isNaN(packet.damage) || packet.damage == 0)
				{
					health -= maxDamage;
				}
				else {
					health -= getDamageEstimate(packet.damage);
				}
				if (usedHealthPotion)
				{
					health+=100;
					usedHealthPotion = false;
				}
				if (useBestEscape(packet.damage)) {
					$.echo("Aoe escape");
					event.cancel();
				}
			}
			break;
		}
	}
}

function getDamageEstimate(baseDamage) {
	var damage = baseDamage - defenceBonus;
	if (damage < 0.15 * baseDamage) {
		damage = 0.15 * baseDamage;
	}
	if (isNaN(damage)) {
		return maxDamage;
	}
	return damage;
}

function getDamageBulletMost() {
	var arr = Object.keys( bulletIdDamageMap ).map(
		function ( key ){ 
			if (bulletIdTickMap[key] > 0) 
				return bulletIdDamageMap[key];
			else
				return 0;
		}
	);
	var value = Math.max.apply( Math, arr );
	if (value == -Infinity) {
		return 0;
	}
	return getDamageEstimate(value);
}

function updateBullet() {
	for (var key in bulletIdTickMap) {
		if (bulletIdTickMap.hasOwnProperty(key)) {
			if (bulletIdTickMap[key] > 0) {
				bulletIdTickMap[key]--;
				//$.echo(bulletIdTickMap[key]);
				// if (bulletIdTickMap[key] <= 0) {
					// bulletIdDamageMap[key] = 0;
				// }
			}
		}
	}
}

function isEmpty(obj) {
	for(var prop in obj) {
		if(obj.hasOwnProperty(prop))
		return false;
	}

	return true;
}

function useBestEscape(damage) {
	//$.echo("escape damage = " + damage);
   var curPercentage = 100 * health / maxHealth;
   if (!isEmpty(bulletIdDamageMap) && (curPercentage <= nexusHealthPercentage || health < damage*nexusTakenHitsLeft)) {
		$.echo("Maxdamage = " + damage + ". Has bullet? " + (!isEmpty(bulletIdDamageMap)).toString());
		useNexus();
		return true;
	}
   else if (!isEmpty(bulletIdDamageMap) && !_skipHealthPotion && _potHealthCount > 0 && curPercentage <= _potHealthPercentage) {
      useHealthPotion();
      return true;
   }
   return false;
}

// creates ESCAPE packet and sends to server
function useNexus() {
   $.echo("Used Nexus. ESCAPE health = " + health + ". Got hit " + counterHit + " times");
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
   usedHealthPotion = true;
}