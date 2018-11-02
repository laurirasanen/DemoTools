var Transformer = require('tf2-demo').Transformer;
var BitStream = require('bit-buffer').BitStream;
var fs = require('fs');
var path = require('path');

function fixModels(input, output, cb) {
	if (!cb || typeof (cb) !== 'function')
        throw ('callback is not a function');
	
	fs.readFile(input, function (err, data) {
		if (err) return cb(err);

		var outputStream = new BitStream(Buffer.alloc(data.length*2)); //output demo is larger than input demo
		var inputStream = new BitStream(data);

		transformer = new Transformer(inputStream,outputStream);

		// relative path from TempusTV
		getModels('../DemoTools/itemdata/changed_models.txt', (err, models) => {
			if(err) return cb(err);
			
			transforms = createTransforms(models);

			transformer.transform(transforms[0],transforms[1]);
			
			// unlink old demo to save disk space
			fs.unlink(input, (err) => {
				if(err) return cb(err);
				
				fs.writeFile(output,outputStream.buffer.slice(0, outputStream.index / 8 + 1),function(err) {
				if (err) return cb(err);
				//console.log("Demo modified");
				return cb();
				});
			});

		});	
	});
}

function getModels(path, cb) {
	if (!cb || typeof (cb) !== 'function')
        throw ('callback is not a function');
	
	var models = [];
	fs.readFile(path, 'utf8', function (err, data) {
		if (err) return cb(err, null);
		lines = data.split('\n');
		for (const line of lines) {
			if (line != "") {
				model = line.split(' ');
				models[model[0].trim()] = model[1].trim();
			}
		}
		return cb(null, models);
	});
}

function createTransforms(models) {
	var messageTransform = function(message) {
		if (message.type == 8) { //stringtables message
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
		if (packet.packetType == 'updateStringTable') {
			if (packet.tableName == 'modelprecache') {
				for(var entry of packet.entries) {
					if (typeof entry !== 'undefined' && entry.text in models) {
						entry.text = models[entry.text];
					}
				}
			}
		}
		return packet;
	};
	return [packetTransform,messageTransform];
}

module.exports.fixModels = fixModels;