var mineflayer = require('mineflayer');
const Block = require("prismarine-block")("1.8");
var vec3 = require('vec3').Vec3;
const  wood = ['oak_wood','spruce_wood','birch_wood','jungle_wood','acacia_wood','dark_oak_wood'];
const mcData=require("minecraft-data")("1.8.8")
var blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
var navigatePlugin = require('mineflayer-navigate')(mineflayer);

//All the axes possible
var all_t = ['diamond_axe', 'iron_axe', 'golden_axe', 'stone_axe', 'wooden_axe']

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
			  
			  //Here it equips the tool for the job
			  for(var i=0; i < all_t.length; i++){
				bot.chat('Entro for items' + all_t[i])
				if (equipItem(all_t[i], 'hand')){
					bot.chat('Entro a item true')
					break;
				}
			  }
			  
				dig_front(blocks)
			  
			  //Minar el bloque de enfrente
			  
			  
			  //bot.quit('quitting');
			  return;
			} else {
			  bot.chat("I couldn't find any Wood within 50.");
			  //bot.quit('quitting');
			  return;
			}
		 });
		break
	case 'chop':
		loop();
		break
  }
});

function blockToHarvest () {
  return bot.findBlock({
    point: bot.entity.position,
    matching: 17,
  })
}

//funcion principal
function loop(){
	for(var a = 0; a <10; a++) {
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
			  
			  //Here it equips the tool for the job
				equipItem(all_t[0], 'hand')
			
			  
				dig_front(blocks)
			  
			  //Minar el bloque de enfrente
			  
			  
			  //bot.quit('quitting');
			  return;
			} else {
			  bot.chat("I couldn't find any Wood within 50.");
			  //bot.quit('quitting');
			  return;
			}
		 });
	}
}

function dig_front(block){
	var target = bot.blockAt(block[0].position)
    if (target && bot.canDigBlock(target)) {
      bot.chat(`starting to dig ${target.name}`)
      bot.dig(target, onDiggingCompleted)
    } else {
      bot.chat('cannot dig')
    }
	
	function onDiggingCompleted (err) {
    if (err) {
      console.log(err.stack)
    }
    bot.chat(`finished digging ${target.name}`)
  }

}

function equipItem (name, destination) {
    const item = itemByName(name)

    if (item) {
        bot.equip(item, destination, checkIfEquipped);
		return true;
    } 
	else {
		//bot.chat(`I have no ${name} to chop this down`);
		return false;
    }

    function checkIfEquipped (err) {
        if (err) {
            bot.chat(`cannot equip ${name}: ${err.message}`);
        } else {
            //bot.chat(`equipped ${name}`);
        }
    }
}

function itemByName (name) {
    return bot.inventory.items().filter(item => item.name === name)[0]
}

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