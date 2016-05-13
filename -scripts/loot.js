
// autoloot.js

var ID_MOVE = $.findPacketId("MOVE");
var ID_UPDATE = $.findPacketId("UPDATE");
var ID_NEW_TICK = $.findPacketId("NEW_TICK");
var ID_CREATE_SUCCESS = $.findPacketId("CREATE_SUCCESS");
var ID_INV_SWAP = $.findPacketId("INVSWAP");

var player_id = -1;
var playerLocation = null;
var lootbags = {};
var lootbaglocs = {};
var playerInventory = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];

var tier = 11; // Minimum tier of items to be autolooted

var desirables = [                              //This is a list of items also to be auto looted. If you need additional items added just message me on rotmgtool.com (spazman6117)
   0xa20, // Def Pot
   0xa1f, // Att Pot
   0xa21, // Spd Pot
   0xa34, // Vit Pot
   0xa35, // Wis Pot
   0xa4c, // Dex Pot
   0xae9, // Life Pot
   0xaea,  // Mana Pot
   0xa40, // Snake Skin Shield
   0xb22, // Colossus Shield
   0xc85, // Common Feline Egg
   0xc86, // Uncommon Feline Egg
   0xc87, // Rare Feline Egg
   0xc88, // Legendary Feline Egg
   0xc89, // Common Canine Egg
   0xc8a, // Uncommon Canine Egg
   0xc8b, // Rare Canine Egg
   0xc8c, // Legendary Canine Egg
   0xc8d, // Common Avian Egg
   0xc8e, // Uncommon Avian Egg
   0xc8f, // Rare Avian Egg
   0xc90, // Legendary Avian Egg
   0xc91 // Common Exotic Egg

            ];

function onClientPacket(event) {
   var packet = event.getPacket();
   switch (packet.id()) {
      case ID_MOVE: {
         var time = packet.time;
         playerLocation = packet.newPosition;

         for(var bag in lootbags){
            if(lootbaglocs[bag].distanceSquaredTo(playerLocation) <= 2){
               for(var idx in lootbags[bag]){
                  if(lootbags[bag][idx] != -1){
                     for(var i = 0; i < playerInventory.length; i++){
                        if(playerInventory[i] == -1){
                           var swapPacket = event.createPacket(ID_INV_SWAP);
                           swapPacket.time = time;
                           swapPacket.position = playerLocation;
                           swapPacket.slotObject1 = event.createSlotObject();
                           swapPacket.slotObject1.objectId = bag;
                           swapPacket.slotObject1.slotId = idx;
                           swapPacket.slotObject1.objectType = lootbags[bag][idx];
                           swapPacket.slotObject2 = event.createSlotObject();
                           swapPacket.slotObject2.objectId = player_id;
                           swapPacket.slotObject2.slotId = i + 4;
                           swapPacket.slotObject2.objectType = -1;
                           event.sendToServer(swapPacket);
                           playerInventory[i] = lootbags[bag][idx];
                           break;
                        }
                     }
                  }
               }
            }
         }
         break;
      }
   }
}

function onServerPacket(event) {
   var packet = event.getPacket();
   switch (packet.id()) {
      case ID_CREATE_SUCCESS: {
         player_id = packet.objectId;
         break;
      }
      case ID_UPDATE: {
         // New objects
         for (var i = 0; i < packet.newObjs.length; i++) {
            var objectData = packet.newObjs[i];
            if(objectData == null)
               break;

            var type = objectData.objectType;

            if(type == 1280 || type == 1283 || (type >= 1286 && type <= 1296)){
               // new loot bag
               var bagId = objectData.status.objectId;
               lootbags[bagId] = [-1,-1,-1,-1,-1,-1,-1,-1];
               lootbaglocs[bagId] = objectData.status.pos;

               for (var j = 0; j < objectData.status.data.length; j++){
                  var statData = objectData.status.data[j];
                  if(statData.obf0 >= 8 && statData.obf0 <= 15){
                     if(statData.obf1 != -1){
                        var item = $.findItem(statData.obf1);

                        if(item.tier >= tier || item.bagType == 4 || desirables.indexOf(statData.obf1) != -1){
                           lootbags[bagId][statData.obf0 - 8] = statData.obf1;
                        }
                     }

                  }
               }
            }

            if(objectData.status.objectId == player_id){
               for (var j = 0; j < objectData.status.data.length; j++){
                  var statData = objectData.status.data[j];

                  if(statData.obf0 >= 12 && statData.obf0 <= 19){
                     playerInventory[statData.obf0-12] = statData.obf1;
                  }
                  else if(statData.obf0 >= 71 && statData.obf0 <= 78){
                     playerInventory[statData.obf0-63] = statData.obf1;
                  }
                  else if(statData.obf0 == 79){
                     objectData.status.data[j].obf1 = 1;
                  }
               }
            }
         }

         // Removed objects
         for (var i = 0; i < packet.drops.length; i++) {
            var droppedObjectId = packet.drops[i];

            if(lootbags[droppedObjectId] != null){
               delete lootbags[droppedObjectId];
               delete lootbaglocs[droppedObjectId];      
            }
         }

         break;
      }
      case ID_NEW_TICK: {
         for (var i = 0; i < packet.statuses.length; i++) {
            var status = packet.statuses[i];

            if(lootbags[status.objectId] != null){
               for (var j = 0; j < status.data.length; j++){
                  var statData = status.data[j];
                  if(statData.obf0 >= 8 && statData.obf0 <= 15){
                     if(statData.obf1 == -1){
                        lootbags[status.objectId][statData.obf0 - 8] = statData.obf1;
                     }else{
                        var item = $.findItem(statData.obf1);

                        if(item.tier >= tier || item.bagType == 4 || desirables.indexOf(statData.obf1) != -1){
                           lootbags[status.objectId][statData.obf0 - 8] = statData.obf1;
                        }
                     }

                  }
               }
            }

            if(status.objectId == player_id){
               for (var j = 0; j < status.data.length; j++){
                  var statData = status.data[j];

                  if(statData.obf0 >= 12 && statData.obf0 <= 19){
                     playerInventory[statData.obf0-12] = statData.obf1;
                  }
                  else if(statData.obf0 >= 71 && statData.obf0 <= 78){
                     playerInventory[statData.obf0-63] = statData.obf1;
                  }
                  else if(statData.obf0 == 79){
                     status.data[j].obf1 = 1;
                  }
               }
            }
         }
         break;
      }
   }
}