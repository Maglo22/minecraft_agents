// run -> node minecraft_follower.js localhost 25565

const mineflayer = require('mineflayer');
const navigate = require('mineflayer-navigate')(mineflayer);
const blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
const vec3 = require('vec3');

const followerFunc = require('../modules/follower_func.mjs')(mineflayer); // local functions

// check for parameters (username and password are required only for online-mode=true servers)
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
bot.loadPlugin(followerFunc);

var timeoutId, timeoutReFollow; // timeouts for following an entity
var intervalAction; // interval timer for the agent interactions
var targetEntity, playerEntity, nearEntity; // target entities for the following and interaction
var visitedEntities = []; // entities the agent has interacted with

// once logged to the server
bot.once('login', () => {
    console.log('\n--- Agent joined the server ---\n'); bot.chat('Hello there');
});

// when it starts or finish raining
bot.on('rain', () => {
    let r = Math.floor(Math.random() * 5); bot.dialogOptions(bot.isRaining, r);
});

// bots health on chat
bot.on('health', () => {
    let health = bot.health/2; bot.chat('<Agent health: ' + health.toFixed(1) + ' hearts>');
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
            followEntity(player); break;
        // stop following
        case /^stop$/.test(message):
            stopFollow();
            bot.chat('No longer following.'); break;
        // list agent inventory
        case /^list$/.test(message):
            bot.sayItems(); break;
        // craft and item
        case /^craft [0-9]+ \w+$/.test(message):
            findCraftingTable(command[2], command[1]); break; // craft amount item -> craft 64 stick
        // list commands
        case /^commands$/.test(message):
            bot.listCommands(); break;
        // leave the server
        case /^leave$/.test(message):
            bot.chat('See ya');
            bot.end(); break;
    }
});

// check the type of nearest entity
function checkNearestEntity() {
    nearEntity = bot.nearestEntity();
    // Sheep
    if (nearEntity.entityType === 91 && !visitedEntities.includes(nearEntity.id)) {
        targetEntity = nearEntity;

        bot.chat('Maybe I can shear this sheep...');

        intervalAction = setInterval(bot.agentAction, 1 * 1000, 'shears', 'hand', targetEntity);
        visitedEntities.push(targetEntity.id);

        timeoutReFollow = setTimeout(followEntity, 4 * 1000, playerEntity);
    }
    // Cow
    else if (nearEntity.entityType === 92 && !visitedEntities.includes(nearEntity.id)) {
        targetEntity = nearEntity;

        bot.chat('This cow looks hungry');

        intervalAction = setInterval(bot.agentAction, 1 * 1000, 'wheat', 'hand', targetEntity);
        visitedEntities.push(targetEntity.id);

        timeoutReFollow = setTimeout(followEntity, 4 * 1000, playerEntity);
    }
    // Chicken
    else if (nearEntity.entityType === 93 && !visitedEntities.includes(nearEntity.id)) {
        targetEntity = nearEntity;

        bot.chat('I have some seeds for this chicken');

        intervalAction = setInterval(bot.agentAction, 1 * 1000, 'wheat_seeds', 'hand', targetEntity);
        visitedEntities.push(targetEntity.id);

        timeoutReFollow = setTimeout(followEntity, 4 * 1000, playerEntity);
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
        if (targetEntity != null) { bot.lookAt(targetEntity.position.plus(vec3(0, 1.62, 0))); }
    });

    checkNearestEntity();

    timeoutId = setTimeout(moveToTarget, 1 * 1000); // repeat call after 1 second
}

// stop the following
function stopFollow() {
    if (targetEntity == null) { return; }
    targetEntity = null;
    clearTimeIntervals();
    bot.navigate.stop('interrupted');
}

// follow entity
function followEntity(entity) {
    if (intervalAction) { stopInterval(); }
    if (entity == null) { return false; }
    if (targetEntity != null) { stopFollow(); }

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
            bot.chat('Error trying to find a crafting table'); return;
        }
        if(block.length) {
            let path = bot.navigate.findPathSync(block[0].position, {
                timeout: 1 * 1000,
                endRadius: 3
            });

            if (path.status == 'success') { bot.chat('Ill use the crafting table at ' + block[0].position); }

            bot.navigate.walk(path.path, function(stopReason) {
                if (block.length) { bot.lookAt(block[0].position.plus(vec3(0, 1.62, 0))); }
                if (stopReason == 'arrived') {
                    bot.craftItem(name, amount, block[0]); // crafts the item
                } else {
                    bot.chat('Couldnt get to the crafting table'); return;
                }
            });
        } else {
            bot.chat('I cant find any crafting table nearby'); return;
        }
    });
}

// on bot quits the server
bot.on('end', () => {
    console.log('\n--- Agent quit the server ---\n'); process.exit(1);
});

/* --- Helper functions --- */
function clearTimeIntervals() {
    clearTimeout(timeoutId); clearTimeout(timeoutReFollow);
    if (intervalAction) { stopInterval(); }
}

function stopInterval() {
    clearInterval(intervalAction);
    intervalAction = false;
}