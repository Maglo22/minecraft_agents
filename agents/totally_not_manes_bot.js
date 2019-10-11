// node totally_not_manes_bot.js localhost 25565

var mineflayer = require('mineflayer');
var blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
const vec3 = require('vec3');

//All the axes possible
var all_t = ['diamond_axe', 'iron_axe', 'golden_axe', 'stone_axe', 'wooden_axe']

var bot = mineflayer.createBot({
  host: "localhost", // optional
  port: 25565,       // optional
  version: false     // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
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

bot.on('chat', function(username, message) {
    if (username === bot.username) return;
    switch(message) {
        case 'chop':
            chop();
            break
        case 'stop':
            bot.chat('stopping');
            stop();
            break;
        case 'leave':
            bot.end();
            break;
    }
});

//funcion principal
function chop() {
    bot.findBlock({
        point: bot.entity.position,
        matching: 17,
        maxDistance: 50,
        count: 1,
        }, function(err, blocks) {
        if (err) {
            bot.chat('Error trying to find Wood: ' + err);
            return;
        }
        if (blocks.length) {
            
            var path = bot.navigate.findPathSync(blocks[0].position, {
                timeout: 1 * 1000,
                endRadius: 1
            });
            bot.navigate.walk(path.path, function() {
                if (blocks.length) {
                    bot.lookAt(blocks[0].position.plus(vec3(0, 1.62, 0)));
                }
            });
            
            equipItem(all_t[0], 'hand'); // Here it equips the tool for the job
            dig_front(blocks); // dig the block
            return;
        } else {
            bot.chat("I couldn't find any Wood within 50.");
            return;
        }
    });
}

function dig_front(block) {
    let target = bot.blockAt(block[0].position);
    bot.chat('Target at ' + target.position + '.');

    if (target && bot.canDigBlock(target)) {
            bot.chat(`starting to dig ${target.name}`);
            bot.dig(target, onDiggingCompleted);
        } else {
            bot.chat('cannot dig');
        }

        function onDiggingCompleted (err) {
            if (err) {
                console.log(err.stack);
            } else {
                bot.chat(`finished digging ${target.name}`);
                timeoutChop = setTimeout(chop, 1 * 1000);
            }
        }
}

function stop() {
    clearTimeout(timeoutChop);
}

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

function itemByName (name) {
    return bot.inventory.items().filter(item => item.name === name)[0];
}