
module.exports = init;

function init() {
    function inject(bot) {


        bot.listCommands = listCommands;
        // list available commands
        function listCommands() {
            bot.chat('follow -> follow player');
            bot.chat('stop -> stop following');
            bot.chat('list -> list inventory');
            bot.chat('craft [amount] [item] -> craft given amount of item');
            bot.chat('leave -> leave server');
        }

        bot.dialogOptions = dialogOptions;
        // return nearest entity to the bot
        function dialogOptions(isRaining, r) {
            if (isRaining) {
                switch(r) {
                    case 0: bot.chat('I should have brought an umbrella'); break;
                    case 1: bot.chat('At least I didnt wash the car today'); break;
                    case 2: bot.chat('Dammit, my clothes!'); break;
                    case 3: bot.chat('Hopefully I didnt leave my laundry hanging'); break;
                    case 4: bot.chat('Should have checked the weather'); break;
                    default: bot.chat('Its raining'); break;
                }
            } else {
                switch(r) {
                    case 0: bot.chat('Maybe I should change clothes to avoid getting sick'); break;
                    case 1: bot.chat('It finally stopped'); break;
                    case 2: bot.chat('Does the rain affect flora in this world?'); break;
                    case 3: bot.chat('Thank goodness the dirt doesnt get wet for whatever reason'); break;
                    case 4: bot.chat('To be honest I do feel more relaxed when its raining'); break;
                    default: bot.chat('Its no longer raining'); break;
                }
            }
        }

        bot.nearestEntity = nearestEntity;
        // returns nearest entity to bot
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

        bot.agentAction = agentAction;
        // agent does an action on an entity
        function agentAction(item, destination, entity) {
            equipItem(item, destination);
            bot.useOn(entity);
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

        // check item in inventory by its name
        function itemByName (name) {
            return bot.inventory.items().filter(item => item.name === name)[0];
        }

        bot.craftItem = craftItem;
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

        bot.sayItems = sayItems;
        // list items in bot inventory
        function sayItems (items = bot.inventory.items()) {
            const output = items.map(itemToString).join(', ');
            if (output) {
                bot.chat(output);
            } else {
                bot.chat('Empty');
            }
        }

        // returns string of the item name + amount in inventory
        function itemToString (item) {
            if (item) {
                return `${item.name} x ${item.count}`;
            } else {
                return '(nothing)';
            }
        }

    }
    return inject;
}