$.echo("UniversalAutoAnswer loaded.");

//AutoThessalAnswer.js

var ID_TEXT = $.findPacketId("TEXT");
var ID_PLAYER_TEXT = $.findPacketId("PLAYERTEXT");
var ID_CREATE_SUCCESS = $.findPacketId("CREATE_SUCCESS");
var ID_NOTIFICATION = $.findPacketId("NOTIFICATION");
var ID_UPDATE = $.findPacketId("UPDATE");
var ID_PLAYERTEXT = $.findPacketId("PLAYERTEXT");

var playerObjectId = -1 ;

// colors 
/*
	var white = 0xFFFFFF;
	var black = 0x000000;
	var lightGrey = 0xC0C0C0;
	var grey = 0x808080;
	var red = 0xFF0000;
	var orange = 0xF0A804;
	var yellow = 0xFFFF00;
	var green = 0x008000;
	var blue = 0x0000FF;
	var purple = 0x800080;
	
	
*/

function onServerPacket(event) {
	
	var packet = event.getPacket();

	switch (packet.id()) {

		case ID_CREATE_SUCCESS: {
			playerObjectId = packet.objectId;
			break;
		}
	
		case ID_TEXT: {
			
				var text = packet.text;//The text inside the packet
				var filteredText = packet.text.toLowerCase();//The text to lower case
				var star = packet.numStars//The player stars
							
						// Dying thessal!
						if (filteredText.indexOf('king') >= 0) { //The text you want to find here
							if (filteredText.indexOf('alexander') >= 0) { //The text you want to find here
								if (star === -1) {//If it's a mob
									playertext(event,"He lives and reigns and conquers the world.")
									$.echo("Good luck on whitebags! ;).");
								}else{$.echo("Someone said the sentence, but he was not a mob.");}
							}//End of fitered "alexander"
						}//End of filtered "king"
						
						
						// Cemetery!
						if (filteredText.indexOf('warrior') >= 0) { //The text you want to find here
							if (filteredText.indexOf('prize') >= 0) { //The text you want to find here
								if (star === -1) {//If it's a mob
									playertext(event,"ready")
									$.echo("Good luck in cemetery! ;).");
								}else{$.echo("Someone said the sentence, but he was not a mob.");}
							}//End of fitered "alexander"
						}//End of filtered "king"
		}//End of case ID_TEXT
	}//End of switch
}//End of function



function playertext(event,tex) {
	var playertextPacket = event.createPacket(ID_PLAYERTEXT);
	playertextPacket.text = tex; //The text you will say
	event.sendToServer(playertextPacket);
}

//Code by Alde, DeVoidCoder & JustANoobROTMG