const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

async function run() {
  const filestream = fs.createReadStream('./data/items.tsv');
  const rl = readline.createInterface({
    input: filestream,
    crlfDelay: Infinity
  });

  const items = {};
  const itemsByType = {};

  for await (const line of rl) {
    const vals = line.split('\t');
    const item = {
      name: vals[0],
      type: vals[1],
      rarity: vals[2],
      attune: vals[3] === 'yes' ? true : false,
      notes: vals[4],
      source: vals[5]
    };

    if (!(item.type in itemsByType)) itemsByType[item.type] = {};

    if (!(item.rarity in itemsByType[item.type]))
      itemsByType[item.type][item.rarity] = [];

    itemsByType[item.type][item.rarity].push(item);
    items[item.name] = item;
  }

  fs.writeFileSync('data/items.json', JSON.stringify(items, null, 2));
  fs.writeFileSync(
    'data/itemsByType.json',
    JSON.stringify(itemsByType, null, 2)
  );
}

(async () => {
  try {
    await run();
  } catch (e) {
    console.log(e);
  }
})();
