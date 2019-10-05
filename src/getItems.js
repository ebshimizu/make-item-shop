const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

/**
 * Formats items into the required JSON format for the item shop script.
 * Can optionally export that data to a JSON if you'd like to use it.
 * @param {String} file Tab-separated file to load items from
 * @param {String?} saveTo Optional file to save the formatted data to
 * @param {Object?} items Appends the retrieved items to this object. Optional.
 * @param {Object?} itemsByType Appends the retrieved items grouped by type and rarity into this object. Optional.
 */
async function itemsFromCSV(
  file,
  saveTo,
  banned = [],
  items = {},
  itemsByType = {}
) {
  const filestream = fs.createReadStream(file);
  const rl = readline.createInterface({
    input: filestream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const vals = line.split('\t');
    const name = vals[0].replace(/"/g, '');

    if (banned.indexOf(name) >= 0) {
      console.log(`Skipping banned item: ${name}`);
      continue;
    }

    const item = {
      name,
      type: vals[1],
      rarity: vals[2],
      attune: vals[3] === 'yes' ? true : false,
      notes: vals[4],
      source: vals[5],
      cost: parseInt(vals[6])
    };

    if (!(item.type in itemsByType)) itemsByType[item.type] = {};

    if (!(item.rarity in itemsByType[item.type]))
      itemsByType[item.type][item.rarity] = [];

    itemsByType[item.type][item.rarity].push(item);
    items[item.name] = item;
  }

  if (saveTo) {
    const dir = path.dirname(saveTo);
    const filename = path.basename(saveTo, '.json');

    fs.writeFileSync(saveTo, JSON.stringify(items, null, 2));
    fs.writeFileSync(
      path.join(dir, `${filename}ByType.json`),
      JSON.stringify(itemsByType, null, 2)
    );
  }

  return { items, itemsByType };
}

async function itemsFromFiles(files, banned = [], exportDir = null) {
  const items = {};
  const itemsByType = {};

  for (const file of files) {
    // discard return type, writing into predefined ref
    const filename = path.basename(file, '.txt');
    const saveTo = exportDir ? path.join(exportDir, `${filename}.json`) : null;

    await itemsFromCSV(file, saveTo, banned, items, itemsByType);
  }

  return { items, itemsByType };
}

module.exports.itemsFromCSV = itemsFromCSV;
module.exports.itemsFromFiles = itemsFromFiles;
