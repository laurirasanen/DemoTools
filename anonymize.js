var Transformer = require('tf2-demo').Transformer;
var fs = require('fs');

var BitStream = require('bit-buffer').BitStream;

function anonymize(input,output,id) {
	fs.readFile(input, function (err, data) {
		if (err) throw err;

		var outputStream = new BitStream(Buffer.alloc(data.length*2)); //output demo is larger than input demo
		var inputStream = new BitStream(data);

		transformer = new Transformer(inputStream,outputStream);

		transforms = createTransforms(id);

		transformer.transform(transforms[0],transforms[1]);

		fs.writeFile(output,outputStream.buffer.slice(0,outputStream.index / 8 + 1),function(err) {
			if (err) throw err;
			console.log("Demo modified");
		});
	});
}

function createTransforms(id) {
	var messageTransform = function(message) {
		if(message.type == 8) { //stringtables message
			for (const table of message.tables) {
				if(table.name == 'userinfo') {
					for (const entry of table.entries) {
						replaceUserInfo(entry,id,id);
					}
				}
				if(table.name == 'DynamicModels') {
					for (const entry of table.entries) {
						entry.text = '';
						entry.extraData = null;
					}
				}
			}
		}
		return message;
	};
	var packetTransform = function(packet) {
		//Replace STV name with demo id
		if(packet.packetType == 'serverInfo') {
			packet.serverName = id;
		}
		//Replace names of users who join later
		if(packet.packetType == 'updateStringTable') {
			if(packet.tableName == 'userinfo') {
				for (const entry of packet.entries) {
					if(typeof entry != 'undefined') {
						replaceUserInfo(entry,id,id);
					}
				}
			}
			if(packet.tableName == 'DynamicModels') {
				return null;
			}
		}
		//Replace all messages with blanks
		if(packet.packetType == 'userMessage') {
			if(packet.userMessageType == 'sayText2') {
				//console.log(packet.client,packet.raw,packet.kind,packet.from,packet.text);
				packet.kind = '';
				packet.from = '';
				packet.text = '';
			}
			if(packet.userMessageType == 'textMsg') {
				packet.text = '';
			}
		}
		//Replace game event packets with nothing
		if(packet.packetType == 'gameEvent') {
			if(packet.event.name == 'server_message') {
				packet.event.values.text = '';
			}
			if(packet.event.name == 'player_connect' || packet.event.name == 'player_connect_client' || packet.event.name == 'player_disconnect' || packet.event.name == 'player_info' || packet.event.name == 'server_addban' || packet.event.name == 'player_team') {
				packet.event.values.name = '';
			}
			if(packet.event.name == 'team_info') {
				packet.event.values.teamname = '';
			}
			if(packet.event.name == 'player_changename') {
				packet.event.values.oldname = '';
				packet.event.values.newname = '';
			}
			return null;
		}
		if(packet.packetType == 'packetEntities') {
			var newEntities = [];
			for(entity of packet.entities) {
				if(entity.serverClass.name == 'CTFWearable') {
					continue; //remove cosmetic entities
				}
				if(entity.serverClass.name.startsWith('CTF')) {
					for(prop of entity.props) {
						if(prop.definition.ownerTableName == 'DT_ScriptCreatedItem' || prop.definition.ownerTableName == 'DT_ScriptCreatedAttribute') {
							if(prop.definition.name == 'm_iEntityLevel' || prop.definition.name == 'm_iItemIDHigh' || prop.definition.name == 'm_iItemIDLow' || prop.definition.name == 'm_iAccountID' || prop.definition.name == 'm_iEntityQuality') {
								prop.value = 0; //Remove identifying item attributes
							}
						}
						if(prop.definition.ownerTableName == 'm_hMyWeapons') {
							prop.value = 0;
						}
					}
				}
				//console.log(entity.serverClass.name);
				newEntities.push(entity);
			}
			packet.entities = newEntities;
		}
		return packet;
	};
	return [packetTransform,messageTransform];
}

function replaceUserInfo(entry,newName,newId) {
	if(entry.extraData) {
		entry.extraData.index = 0;
		var user_id = entry.extraData.readUint32();

		const buffer = Buffer.alloc(entry.extraData.length / 8);
		var replace = new BitStream(buffer);

		replace.writeUTF8String(newName,32); //replace name
		replace.writeUint32(user_id); //user id stays the same
		replace.writeUTF8String(newId,byteLength(newId)); //replace steam ID
	
		entry.extraData = replace; //replace the entry in the string table
	}
}

function byteLength(str) {
  // returns the byte length of an utf8 string
  var s = str.length;
  for (var i=str.length-1; i>=0; i--) {
    var code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) s++;
    else if (code > 0x7ff && code <= 0xffff) s+=2;
    if (code >= 0xDC00 && code <= 0xDFFF) i--;
  }
  return s;
}