import vdf

new = vdf.parse(open("items_game.txt"))
old = vdf.parse(open("items_game_old.txt"))

f = open('changed_models.txt', 'a')
f.truncate(0)

for key, value in old['items_game']['items'].items():
	if 'model_player' in value:
		old_model = value['model_player']
		if 'model_player' in new['items_game']['items'][key]:
			new_model = new['items_game']['items'][key]['model_player']
			if old_model != new_model:
				f.write("%s %s\n" % (old_model, new_model))
f.close()