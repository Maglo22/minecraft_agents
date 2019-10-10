var mineflayer = require('mineflayer');
const Block = require("prismarine-block")("1.8");
var vec3 = require('vec3').Vec3;
const  wood = ['oak_wood','spruce_wood','birch_wood','jungle_wood','acacia_wood','dark_oak_wood'];
const mcData=require("minecraft-data")("1.8.8")
var blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
var navigatePlugin = require('mineflayer-navigate')(mineflayer);


var bot = mineflayer.createBot({
  host: "localhost", // optional
  port: 25565,       // optional
  version: false     // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
});

bot.loadPlugin(blockFinderPlugin);
navigatePlugin(bot);

var working = false;

bot.navigate.on('cannotFind', function (closestPath) {
  bot.chat('unable to find path. getting as close as possible')
  bot.navigate.walk(closestPath)
});

bot.on('chat', function(username, message) {
  if (username === bot.username) return;
  switch(message){
	case 'work':
		if (working){
			message1 = 'am already working';
			bot.chat(message1);
		} else {
			message1 = 'Okey mah mastah';
			working = true;
			bot.chat(message1);
			//spawner();
		}
		break
	case 'stop working':
		if (working){
			message1 = 'k, am gonna stop';
			bot.chat(message1);
			working = false;
		} else {
			message1 = 'm8, am not even working';
			bot.chat(message1);
		}
		break
	case 'speak':
		sayItems();
		break
	case 'come':
		const target = bot.players[username].entity
		bot.navigate.to(target.position)
		bot.chat('Coor:' + target.position)
		break
	case 'test':
		bot.findBlock({
			point: bot.entity.position,
			matching: 17,
			maxDistance: 50,
			count: 1,
		  }, function(err, blocks) {
			if (err) {
			  return bot.chat('Error trying to find Wood: ' + err);
			  //bot.quit('quitting');
			  return;
			}
			if (blocks.length) {
			  bot.navigate.to(blocks[0].position);
			  bot.chat('I found Wood at ' + blocks[0].position + '.')
			  //bot.quit('quitting');
			  return;
			} else {
			  bot.chat("I couldn't find any Wood within 50.");
			  //bot.quit('quitting');
			  return;
			}
		 });
		break
  }
});

function sayItems (items = bot.inventory.items()) {
  const output = items.map(itemToString).join(', ')
  if (output) {
    bot.chat(output)
  } else {
    bot.chat('empty')
  }
}

function itemToString (item) {
  if (item) {
    return `${item.name} x ${item.count}`
  } else {
    return '(nothing)'
  }
}




bot.on('error', err => console.log(err))