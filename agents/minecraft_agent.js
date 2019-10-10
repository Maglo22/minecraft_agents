// node minecraft_agent.js localhost 25565

const mineflayer = require('mineflayer')
const navigate = require('mineflayer-navigate')(mineflayer);
const vec3 = require('vec3');

// check for parameters
// username and password are required only for online-mode=true servers
if (process.argv.length < 4 || process.argv.length > 6) {
    console.log('Usage: node minecraft_agent.js <host> <port> [<username>] [<password>]')
    process.exit(1);
}

// create and return an instance of the class bot.
const bot = mineflayer.createBot({
    host: process.argv[2],
    port: parseInt(process.argv[3]),
    username: process.argv[4] ? process.argv[4] : 'Agent',
    password: process.argv[5],
    version: false // false -> auto detection of server version
});

// install plugins
navigate(bot);

var timeoutId, timeoutReFollow;
var targetEntity, playerEntity, nearEntity;
var visitedEntities = [];

// once logged to the server
bot.once('login', () => {
    console.log('\n--- Agent joined the server ---\n');
    bot.chat('Hello there');
});

// when it starts or finish raining
bot.on('rain', () => {
    if(bot.isRaining) {
        bot.chat('Its rain time');
    } else {
        bot.chat('Its no longer rain time');
    }
});

// bots health on chat
bot.on('health', () => {
    bot.chat('<Agent health: ' + bot.health/2 + ' hearts>');
});

// when chat is activated
bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    const command = message.split(' ');
    const player = bot.players[username].entity; // player chatting
    playerEntity = player;

    switch (true) {
        // follow player
        case /^follow$/.test(message):
            bot.chat('Following ' + player.username);
            followEntity(player);
            break;
        // stop following
        case /^stop$/.test(message):
            stopFollow();
            bot.chat('No longer following.');
            break;
        // list agent inventory
        case /^list$/.test(message):
            // list inventory
            sayItems();
            break;
        // craft and item
        case /^craft [0-9]+ \w+$/.test(message):
            // craft amount item -> craft 64 stick
            craftItem(command[2], command[1]);
            break;
        // leave the server
        case /^leave$/.test(message):
            bot.chat('See ya');
            bot.end();
            break;
    }
});

// equip item in destination given
function equipItem (name, destination) {
    const item = itemByName(name)
    if (item) {
        bot.equip(item, destination, checkIfEquipped);
    } else {
        bot.chat(`I have no ${name}`);
    }

    function checkIfEquipped (err) {
        if (err) {
            bot.chat(`cannot equip ${name}: ${err.message}`);
        } else {
            //bot.chat(`equipped ${name}`);
        }
    }
}

// check the type of nearest entity
function checkNearestEntity() {
    nearEntity = nearestEntity();
    // Sheep
    if (nearEntity.entityType === 91) {
        if (!visitedEntities.includes(nearEntity.id)) {
            targetEntity = nearEntity;

            bot.chat('Maybe I can shear this sheep...');

            equipItem('shears', 'hand');
            bot.useOn(targetEntity);

            visitedEntities.push(nearEntity.id);

            timeoutReFollow = setTimeout(followEntity, 4 * 1000, playerEntity);
        }
    }
    // Cow
    else if (nearEntity.entityType === 92) {
        if(!visitedEntities.includes(nearEntity.id)) {
            targetEntity = nearEntity;

            bot.chat('This cow looks hungry');

            equipItem('wheat', 'hand');
            bot.useOn(targetEntity);

            visitedEntities.push(nearEntity.id);

            timeoutReFollow = setTimeout(followEntity, 4 * 1000, playerEntity);
        }
    }
    // Chicken
    else if (nearEntity.entityType === 93) {
        if (!visitedEntities.includes(nearEntity.id)) {
            targetEntity = nearEntity;

            bot.chat('I have some seeds for this chicken');

            equipItem('wheat_seeds', 'hand');
            bot.useOn(targetEntity);

            visitedEntities.push(nearEntity.id);

            timeoutReFollow = setTimeout(followEntity, 4 * 1000, playerEntity);
        }
    }
}

// move to a target entity's position
function moveToTarget() {
    if (targetEntity == null) return;

    var path = bot.navigate.findPathSync(targetEntity.position, {
        timeout: 1 * 1000,
        endRadius: 2
    });
    bot.navigate.walk(path.path, function() {
        if (targetEntity != null) {
            bot.lookAt(targetEntity.position.plus(vec3(0, 1.62, 0)));
        }
    });

    checkNearestEntity();

    timeoutId = setTimeout(moveToTarget, 1 * 1000); // repeat call after 1 second
}

// stop the following
function stopFollow() {
    if (targetEntity == null) return;
    targetEntity = null;
    clearTimeout(timeoutId);
    clearTimeout(timeoutReFollow);
    bot.navigate.stop('interrupted');
}

// follow entity
function followEntity(entity) {
    if (entity == null) return false;

    if (targetEntity != null) {
        stopFollow();
    }
    targetEntity = entity;

    timeoutId = setTimeout(moveToTarget, 0); // do inmediately
    
    return true;
}

// on bot quits the server
bot.on('end', () => {
    console.log('\n--- Agent quit the server ---\n');
    process.exit(1);
});

// return nearest entity to the bot
function nearestEntity (type) {
    let id;
    let entity;
    let dist;
    let best = null;
    let bestDistance = null;
    for (id in bot.entities) {
        entity = bot.entities[id];
        if (type && entity.type !== type) continue;
        if (entity === bot.entity) continue;
        dist = bot.entity.position.distanceTo(entity.position);
        if (!best || dist < bestDistance) {
            best = entity;
            bestDistance = dist;
        }
    }
    return best;
}

// list items in bot inventory
function sayItems (items = bot.inventory.items()) {
    const output = items.map(itemToString).join(', ')
    if (output) {
        bot.chat(output);
    } else {
        bot.chat('Empty');
    }
}

// craft an item given its name and amount
function craftItem (name, amount) {
    amount = parseInt(amount, 10);
    const item = require('minecraft-data')(bot.version).findItemOrBlockByName(name); // finds the item by name
    // finds nearest crafting table
    const craftingTable = bot.findBlock({
        matching: 58 // crafting table id
    });

    if (item) {
        const recipe = bot.recipesFor(item.id, null, 1, craftingTable)[0]; // holds the first recipe found to craft the item
        if (recipe) {
        bot.chat(`Crafting ${name}...`);
        bot.craft(recipe, amount, craftingTable, (err) => {
            if (err) {
                bot.chat(`Error crafting ${name}`);
            } else {
                bot.chat(`Crafted ${name} (x ${amount})`);
            }
        });
        } else {
            bot.chat(`I cannot craft ${name}`);
        }
    } else {
        bot.chat(`Unknown item: ${name}`);
    }
}

// check item in inventory by its name
function itemByName (name) {
    return bot.inventory.items().filter(item => item.name === name)[0]
}

function itemToString (item) {
    if (item) {
        return `${item.name} x ${item.count}`;
    } else {
        return '(nothing)';
    }
}