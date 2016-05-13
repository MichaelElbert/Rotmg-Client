    //cloaktimer.js

    var ID_NOTIFICATION = $.findPacketId("NOTIFICATION");
    var ID_CREATE_SUCCESS = $.findPacketId("CREATE_SUCCESS");
    var ID_USEITEM = $.findPacketId("USEITEM");

    var playerId = -1;

    function onClientPacket(event) {
       var packet = event.getPacket();
       switch (packet.id()) {
          case ID_USEITEM: {
             if (packet.slotObject.objectType == 2646) {
                cloakTimer(event, 0);
             } else if (packet.slotObject.objectType == 2647) {
                cloakTimer(event, 1);
             } else if (packet.slotObject.objectType == 3109 || packet.slotObject.objectType == 2648) {
                cloakTimer(event, 2);
             } else if (packet.slotObject.objectType == 2779) {
                cloakTimer(event, 3);
             } else if (packet.slotObject.objectType == 2649) {
                cloakTimer(event, 4);
             } else if (packet.slotObject.objectType == 2785 || packet.slotObject.objectType == 2855 || packet.slotObject.objectType == 2650) {
                cloakTimer(event, 5);
             }
             break;
          }
       }
    }

    function onServerPacket(event) {
       var packet = event.getPacket();
       switch (packet.id()) {
          case ID_CREATE_SUCCESS: {
             playerId = packet.objectId;
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

    function cloakTimer(event, cloak) {
       var sec = ["5.5","5.0","4.5","4.0","3.5","3.0","2.5","2.0","1.5","1.0","0.5","0.0"];
       var sec2 = 0.0;
       var colors = [0x30FF00,0x50FF00,0x70FF00,0xB0FF00,0xD0FF00,0xF0FF00,0xFFD000,0xFFB000,0xFF9000,0xFF5000,0xFF3000,0xFF1000];
       for (var i = 5 - cloak; i < sec.length; i++) {
          $.scheduleEvent(sec2, "displayNotification", playerId, colors[i], sec[i]);
          sec2 += 0.5;
       }
    }
