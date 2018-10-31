var Transformer = require('tf2-demo').Transformer;
var fs = require('fs');
var path = require('path');

var BitStream = require('bit-buffer').BitStream;

function fixOriginal(input,output) {
	fs.readFile(input, function (err, data) {
		if (err) throw err;

		var outputStream = new BitStream(Buffer.alloc(data.length+128)); //output demo is larger than input demo
		var inputStream = new BitStream(data);

		transformer = new Transformer(inputStream,outputStream);

		transforms = createTransforms();

		transformer.transform(transforms[0],transforms[1]);

		fs.writeFile(output,outputStream.buffer.slice(0,outputStream.index / 8 + 1),function(err) {
			if (err) throw err;
			console.log("Demo modified");
		});
	});
}

function createTransforms() {
	var messageTransform = function(message) {
		if(message.type == 8) { //stringtables message
			for (const table of message.tables) {
				if(table.name == 'modelprecache') {
					for (const entry of table.entries) {
						if (entry.text == "models/weapons/c_models/c_bet_rocketlauncher/c_bet_rocketlauncher.mdl") {
							entry.text = "models/workshop_partner/weapons/c_models/c_bet_rocketlauncher/c_bet_rocketlauncher.mdl"
						}
					}
				}
			}
		}
		return message;
	};
	var packetTransform = function(packet) {
		return packet;
	};
	return [packetTransform,messageTransform];
}

fixOriginal("original.dem", "original_fixed.dem");