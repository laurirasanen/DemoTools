var Transformer = require('tf2-demo').Transformer;
var fs = require('fs');
var path = require('path');

var BitStream = require('bit-buffer').BitStream;

function fixModels(input, output, changed_models) {
	fs.readFile(input, function (err, data) {
		if (err) throw err;

		var outputStream = new BitStream(Buffer.alloc(data.length*2)); //output demo is larger than input demo
		var inputStream = new BitStream(data);

		transformer = new Transformer(inputStream,outputStream);

		transforms = createTransforms(changed_models);

		transformer.transform(transforms[0],transforms[1]);

		fs.writeFile(output,outputStream.buffer.slice(0, outputStream.index / 8 + 1),function(err) {
			if (err) throw err;
			console.log("Demo modified");
		});
	});
}

function createTransforms(models) {
	var messageTransform = function(message) {
		if(message.type == 8) { //stringtables message
			for (var table of message.tables) {
				if(table.name == 'modelprecache') {
					for (var entry of table.entries) {
						if (entry.text in models) {
							entry.text = models[entry.text];
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

function getModels(path) {
	var models = [];
	fs.readFile(path, 'utf8', function (err, data) {
		if (err) throw err;
		lines = data.split('\n');
		for (const line of lines) {
			if (line.trim() != "") {
				model = line.split(' ');
				models[model[0].trim()] = model[1].trim();
			}
		}
	});
	return models;
}

models = getModels('itemdata/changed_models.txt');
//fixModels("sor.dem", "sor_fixed.dem", models);