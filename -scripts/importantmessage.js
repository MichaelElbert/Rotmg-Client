//ImportantMessage.js

$.echo("Important Message loaded.");

var ID_TEXT = $.findPacketId("TEXT");
var ID_CREATE_SUCCESS = $.findPacketId("CREATE_SUCCES");
var playerObjectId = -1 ;

var keywords = [//The bank of words you want to be notified when the script sees it.
        "cem",
        "cemetery",
		"Crystal",
		"Horse",
        "horse",
        "Cryst",
        "lab",
        "labotary",
        "abyss",
        "undead",
        "udl",
        "shatter",
		"shatters",
		"cheater",
        "hacker",
		"snake",
		"white bag",
		"quick",
        "hacker"
];


var nopes = [//The words you dont want to be alerted. EX : Lab = YES! Any labs? = NO!
        "any",
        "please",
        "full"
];

function onServerPacket(event) {
        // get the packet involved in this event
        var packet = event.getPacket();
        var star = packet.numStars//The player stars
		
		//If it's a Create_Sucess packet...
		if (packet.id() == ID_CREATE_SUCCESS) {
		playerObjectId = packet.objectId;
		}
		
        // if this event's packet is a TEXT packet...
        if (packet.id() == ID_TEXT) {
        
                // make text lowercase to match the keyword list
                var text = packet.text.toLowerCase();
                
                // loop through every keyword for testing
                for (var i = 0; i < keywords.length; i++) {
                
                        // if keyword exists in the text...
                        if (text.indexOf(keywords[i]) != -1) {
						
							if (star > 1){//If its not a bot
							
								if (text.indexOf(nopes[i]) < 0) {
									serveralert(event,playerObjectId,"Important message :");
								}
							}
						}
                }
        }
		

}



function serveralert(event, playerObjectId, text) {
	var textPacket = event.createPacket(ID_TEXT);
	textPacket.name = ""; //Yellow text
	textPacket.objectId = playerObjectId;
	textPacket.numStars = -1;
	textPacket.bubbleTime = 3;//The time the bubble stays
	textPacket.recipient = "JKCX";
	textPacket.text = text;
	textPacket.cleanText = "";
	event.sendToClient(textPacket);
}