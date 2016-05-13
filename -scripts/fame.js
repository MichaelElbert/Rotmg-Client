    var ID_NEW_TICK = $.findPacketId("NEW_TICK");
    var ID_CREATE_SUCCESS = $.findPacketId("CREATE_SUCCESS");
    var ID_NOTIFICATION = $.findPacketId("NOTIFICATION");
    var ID_UPDATE = $.findPacketId("UPDATE");

    var player_id = -1;
    var currentFame = -1;

    function onServerPacket(event) {
       var packet = event.getPacket();
       switch (packet.id()) {
          case ID_CREATE_SUCCESS: {
             player_id = packet.objectId;
             break;
          }
          case ID_NEW_TICK: {
             for (var i = 0; i < packet.statuses.length; i++) {
                var status = packet.statuses[i];


                if(status.objectId == player_id){
                   for (var j = 0; j < status.data.length; j++){
                      var statData = status.data[j];

                      if(statData.obf0 == 57){
                         if(currentFame != statData.obf1){
                            var diff = statData.obf1 - currentFame;
                            currentFame = statData.obf1;
                            this.displayNotification(event,player_id,0xFF8000,"+ " + diff + " Fame");
                         }
                      }
                   }
                }
             }
             break;
          }
          case ID_UPDATE: {
             for (var i = 0; i < packet.newObjs.length; i++) {
                var objectData = packet.newObjs[i];
                if(objectData.status.objectId == player_id){
                   for (var j = 0; j < objectData.status.data.length; j++){
                      var statData = objectData.status.data[j];

                      if(statData.obf0 == 57){
                         currentFame = statData.obf1;
                      }
                   }
                }
             }
             break;
          }
       }
    }


    function displayNotification(event, playerObjectId, color, text) {
       var notificationPacket = event.createPacket(ID_NOTIFICATION);
       notificationPacket.objectId = playerObjectId;
       notificationPacket.message = "{\"key\":\"blank\",\"tokens\":{\"data\":\"" + text + "\"}}";
       notificationPacket.color = color;
       event.sendToClient(notificationPacket);
    }
