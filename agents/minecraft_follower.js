// node minecraft_follower.js localhost 25565

const mineflayer = require('mineflayer');
const navigate = require('mineflayer-navigate')(mineflayer);
const blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
const vec3 = require('vec3');

// check for parameters
// username and password are required only for online-mode=true servers
if (process.argv.length < 4 || process.argv.length > 6) {
    console.log('Usage: node minecraft_agent.js <host> <port> [<username>] [<password>]');
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
bot.loadPlugin(blockFinderPlugin);

var timeoutId, timeoutReFollow; // timeouts for following an entity
var intervalAction; // interval timer for the agent interactions
var targetEntity, playerEntity, nearEntity; // target entities for the following and interaction
var visitedEntities = []; // entities the agent has interacted with

// once logged to the server
bot.once('login', () => {
    console.log('\n--- Agent joined the server ---\n');
    bot.chat('Hello there');
});

// when it starts or finish raining
bot.on('rain', () => {
    let r = Math.floor(Math.random() * 5); 
    dialogOptions(bot.isRaining, r);
});


// bots health on chat
bot.on('health', () => {
    let health = bot.health/2;
    bot.chat('<Agent health: ' + health.toFixed(1) + ' hearts>');
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
            findCraftingTable(command[2], command[1]);
            break;
        // list commands
        case /^commands$/.test(message):
            listCommands();
            break;
        // leave the server
        case /^leave$/.test(message):
            bot.chat('See ya');
            bot.end();
            break;
    }
});

// list available commands
function listCommands() {
    bot.chat('follow -> follow player');
    bot.chat('stop -> stop following');
    bot.chat('list -> list inventory');
    bot.chat('craft amount item -> craft given amount of item');
    bot.chat('leave -> leave server');
}

// equip item in destination given
function equipItem (name, destination) {
    const item = itemByName(name);
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

            intervalAction = setInterval(agentAction, 1 * 1000, 'shears', 'hand', targetEntity);
            visitedEntities.push(targetEntity.id);

            timeoutReFollow = setTimeout(followEntity, 4 * 1000, playerEntity);
        }
    }
    // Cow
    else if (nearEntity.entityType === 92) {
        if(!visitedEntities.includes(nearEntity.id)) {
            targetEntity = nearEntity;

            bot.chat('This cow looks hungry');

            intervalAction = setInterval(agentAction, 1 * 1000, 'wheat', 'hand', targetEntity);
            visitedEntities.push(targetEntity.id);

            timeoutReFollow = setTimeout(followEntity, 4 * 1000, playerEntity);
        }
    }
    // Chicken
    else if (nearEntity.entityType === 93) {
        if (!visitedEntities.includes(nearEntity.id)) {
            targetEntity = nearEntity;

            bot.chat('I have some seeds for this chicken');

            intervalAction = setInterval(agentAction, 1 * 1000, 'wheat_seeds', 'hand', targetEntity);
            visitedEntities.push(targetEntity.id);

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
    clearTimeIntervals();
    bot.navigate.stop('interrupted');
}

// follow entity
function followEntity(entity) {
    if (intervalAction) stopInterval();
    if (entity == null) return false;

    if (targetEntity != null) {
        stopFollow();
    }
    targetEntity = entity;

    timeoutId = setTimeout(moveToTarget, 0); // do inmediately
    
    return true;
}

// finds nearest crafting table
function findCraftingTable(name, amount) {
    bot.findBlock({
        point: bot.entity.position,
        matching: 58, // crafting table id
        maxDistance: 25
    }, function(err, block) {
        if (err) {
            // console.log(err);
            bot.chat('Error trying to find a crafting table');
            return;
        }
        if(block.length) {
            let path = bot.navigate.findPathSync(block[0].position, {
                timeout: 1 * 1000,
                endRadius: 3
            });

            if (path.status == 'success') {
                bot.chat('Ill use the crafting table at ' + block[0].position);
            }

            bot.navigate.walk(path.path, function(stopReason) {
                if (block.length) {
                    bot.lookAt(block[0].position.plus(vec3(0, 1.62, 0)));
                }
                if (stopReason == 'arrived') {
                    craftItem(name, amount, block[0]); // crafts the item
                } else {
                    bot.chat('Couldnt get to the crafting table');
                    return;
                }
            });
        } else {
            bot.chat('I cant find any crafting table nearby');
            return;
        }
    });
}

// craft an item given its name and amount
function craftItem (name, amount, craftingTable) {
    amount = parseInt(amount, 10);
    const item = require('minecraft-data')(bot.version).findItemOrBlockByName(name); // finds the item by name
    
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

// on bot quits the server
bot.on('end', () => {
    console.log('\n--- Agent quit the server ---\n');
    process.exit(1);
});

/* --- Helper functions --- */

// return nearest entity to the bot
function dialogOptions(isRaining, r) {
    if (isRaining) {
        switch(r) {
            case 0:
                bot.chat('I should have brought an umbrella');
                break;
            case 1:
                bot.chat('At least I didnt wash the car today');
                break;
            case 2:
                bot.chat('Dammit, my clothes!');
                break;
            case 3:
                bot.chat('Hopefully I didnt leave my laundry hanging');
                break;
            case 4:
                bot.chat('Should have checked the weather');
                break;
            default:
                bot.chat('Its raining');
                break;
        }
    } else {
        switch(r) {
            case 0:
                bot.chat('Maybe I should change clothes to avoid getting sick');
                break;
            case 1:
                bot.chat('It finally stopped');
                break;
            case 2:
                bot.chat('Does the rain affect flora in this world?');
                break;
            case 3:
                bot.chat('Thank goodness the dirt doesnt get wet for whatever reason');
                break;
            case 4:
                bot.chat('To be honest I do feel more relaxed when its raining');
                break;
            default:
                bot.chat('Its no longer raining');
                break;
        }
    }
}

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

// agent does an action on an entity
function agentAction(item, destination, entity) {
    equipItem(item, destination);
    bot.useOn(entity);
}

// list items in bot inventory
function sayItems (items = bot.inventory.items()) {
    const output = items.map(itemToString).join(', ');
    if (output) {
        bot.chat(output);
    } else {
        bot.chat('Empty');
    }
}

// check item in inventory by its name
function itemByName (name) {
    return bot.inventory.items().filter(item => item.name === name)[0];
}

// returns string of the item name + amount in inventory
function itemToString (item) {
    if (item) {
        return `${item.name} x ${item.count}`;
    } else {
        return '(nothing)';
    }
}

function clearTimeIntervals() {
    clearTimeout(timeoutId);
    clearTimeout(timeoutReFollow);
    if (intervalAction) stopInterval();
}

function stopInterval() {
    clearInterval(intervalAction);
    intervalAction = false;
}