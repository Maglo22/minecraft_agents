// run -> node minecraft_lumberjack.js

var mineflayer = require('mineflayer');
var blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
const vec3 = require('vec3');

//All the axes possible
var all_t = ['diamond_axe', 'iron_axe', 'golden_axe', 'stone_axe', 'wooden_axe']

var bot = mineflayer.createBot({
  host: "localhost", // optional
  port: 25565,       // optional
  version: false     // false -> auto version detection (default), put for example "1.8.8" if you need a specific version
});

bot.loadPlugin(blockFinderPlugin);
navigatePlugin(bot);


var timeoutChop;

bot.once('login', () => {
    console.log('\n--- Agent joined the server ---\n');
});

bot.on('end', () => {
    console.log('\n--- Agent quit the server ---\n');
    process.exit(1);
});

// commands in chat
bot.on('chat', function(username, message) {
    if (username === bot.username) return;
    switch(message) {
		// chop a tree (goes forever)
        case 'chop':
            chop();
            break
		// stop what the bot is currently doing
        case 'stop':
            bot.chat('stopping');
            stop();
            break;
		// A* excecution function that sets the current position of the player as a target and uses it as the end of the path to follow
		case 'come':
			const target = bot.players[username].entity
			bot.navigate.to(target.position)
		break
			break;
		// leave the server 
        case 'leave':
            bot.end();
            break;
    }
});

// This is the most important function of the program, the chop function
function chop() {
	// First it finds a block and gets its position
    bot.findBlock({
        point: bot.entity.position,
		// find blocks with this id, 17 -> wood block types
        matching: 17,
		// how far you want the agent to see, take in consideration that its the updated distance, meaning, if he chops down a tree and finds a new one and goes to chop it, his distance will be 50 blocks from the new tree. 
		// this kind of makes it an infinite loop since it would be weird to not see a tree within 50 blocks away. 
        maxDistance: 50,
        count: 1,
        }, function(err, blocks) {
        if (err) {
			// error while trying to find the block
            bot.chat('Error trying to find Wood: ' + err);
            return;
        }
        if (blocks.length) {
            // here the agent calls the A* function and sets the path to the block sending the final position, a timeout and an end radius. 
            var path = bot.navigate.findPathSync(blocks[0].position, {
                timeout: 1 * 1000,
                endRadius: 1
            });
			// once it gets the path it will walk to it, this ensures that, he will start walking once he finds a safe path first
            bot.navigate.walk(path.path, function() {
                if (blocks.length) {
					// lock the agents eyes to the wooden block so he will select it with the tool
                    bot.lookAt(blocks[0].position.plus(vec3(0, 0, 0)));
					// the dig function is called once you are sure the agent is looking at the wooden block
					dig_front(blocks);
                }
            });
			// you can show a message once the agent has arrived, since this is called every time it chops ONE log then, it will look weir seen the agent telling you he arrived every time he chops down a tree. So its commented in this case
			bot.navigate.on('arrived', function () {
				//bot.chat("I have arrived");
			});
            return;
        } else {
			// if the agent cant find a block within the max distance, it will announce it in chat
            bot.chat("I couldn't find any Wood within 50.");
            return;
        }
    });
}

// dig the block in front of the agent
function dig_front(block) {
	// get the block position and save it as a target so the bot can later on chop it down
    var target = bot.blockAt(block[0].position);
    bot.chat('Target at ' + target.position + '.');
	
	// if the agent has the proper tool to chop, then, he will start choppig wood
    if (target && bot.canDigBlock(target)) {
            bot.chat(`starting to dig ${target.name}`);
			// the agent digs the wood
            bot.dig(target, onDiggingCompleted);
        } else {
			// if the agent has no tool, or is in a position that makes it impossible, then, it will say "cannot dig"
            bot.chat('cannot dig');
        }
		
		// when the agent finishes chopping the wood log
        function onDiggingCompleted (err) {
            if (err) {
                console.log(err.stack);
            } else {
                bot.chat(`finished digging ${target.name}`);
                timeoutChop = setTimeout(chop, 1 * 1000);
            }
        }
}

// bot stops whatever its doing 
function stop() {
    clearTimeout(timeoutChop);
}

// equip an item in the destination given (hands, for example)
function equipItem (name, destination) {
    const item = itemByName(name);

    if (item) {
        bot.equip(item, destination, checkIfEquipped);
		return true;
    } else {
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

// returns an item instance based on a name given
function itemByName (name) {
    return bot.inventory.items().filter(item => item.name === name)[0];
}