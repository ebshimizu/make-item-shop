// params
// - avg items to make of each type
const random = require('random');
const fs = require('fs-extra');
const merge = require('deepmerge');
const slugify = require('slugify');
const getItems = require('./getItems');
const path = require('path');

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];
const SOURCES = {
  DMG: 'dmg',
  XGE: 'xge'
};
const MAX_LOOPS = 25;
const DATA_PATH = path.join(__dirname, 'db');

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Returns the weighted distributions of item rarities by type
 * @param {Object} data Items object
 */
function preprocessItems(items) {
  const dist = {};
  const distTotals = {};
  for (const rarity of RARITIES) {
    dist[rarity] = {};
    distTotals[rarity] = 0;
  }

  for (const type in items) {
    for (const rarity in items[type]) {
      if (rarity in items[type])
        dist[rarity][type] = items[type][rarity].length;

      distTotals[rarity] += dist[rarity][type];
    }
  }

  // normalize each category
  for (const rarity in dist) {
    for (const type in dist[rarity]) {
      dist[rarity][type] /= distTotals[rarity];
    }
  }

  return dist;
}

function getCurrentTypeDist(type, items) {
  const typeData = items[type];
  const dist = {};
  let total = 0;
  for (const rarity in typeData) {
    dist[rarity] = typeData[rarity].length;
    total += dist[rarity];
  }

  if (total === 0) return {};

  // normalize
  for (const rarity in dist) {
    dist[rarity] /= total;
  }

  return dist;
}

/**
 * Samples from a weighted distribution. Keys are in the given order in dist, maps to
 * the weight for each category
 * @param {Object} dist
 */
function sampleFromWeightedDist(dist) {
  if (Object.keys(dist).length === 0) {
    console.log('[WARN] Distribution has no elements, returning null');
    return null;
  }

  let rng = random.uniform(0, 1)();

  for (const key in dist) {
    rng -= dist[key];

    if (rng < 0) return key;
  }

  // return final object if somehow we're still in that loop
  return Object.keys(dist)[Object.keys(dist).length - 1];
}

function getRandomKey(obj) {
  return Object.keys(obj)[random.uniformInt(0, Object.keys(obj).length - 1)()];
}

function countExistingRarities(shop) {
  const existing = {
    Common: 0,
    Uncommon: 0,
    Rare: 0,
    'Very Rare': 0,
    Legendary: 0
  };

  for (const item of shop) {
    existing[item.rarity] += 1;
  }

  return existing;
}

function countExistingTypes(shop) {
  const existing = {
    Armor: 0,
    Potion: 0,
    Ring: 0,
    Rod: 0,
    Scroll: 0,
    Staff: 0,
    Wand: 0,
    Weapon: 0,
    'Wondrous Item': 0
  };

  for (const item of shop) {
    existing[item.type] += 1;
  }

  return existing;
}

function getRarityDistribution(params) {
  const rarityDist = {};

  // determine the proportions
  let total = 0;
  for (const rarity in params.dist) {
    const rDist = params.dist[rarity];
    rarityDist[rarity] = clamp(
      rDist.weight + random.normal(0, rDist.var)(),
      0,
      1
    );
    total += rarityDist[rarity];
  }

  // do a correction (normalization)
  console.log('Item Distribution:');
  for (const rarity in rarityDist) {
    rarityDist[rarity] /= total;

    // print for debug
    console.log(`${(rarityDist[rarity] * 100).toFixed(2)}% : ${rarity}`);
  }

  return rarityDist;
}

function getItem(type, rarity, itemPool, withRemoval) {
  // randomly select an item
  const pool = itemPool[type][rarity];

  // if pool is empty, return a null item
  if (pool.length === 0) return null;

  const selected = random.uniformInt(0, pool.length - 1)();
  const item = pool[selected];

  if (withRemoval) {
    pool.splice(selected, 1);
  }

  return item;
}

function sampleRequiredItems(params, shop, items) {
  // just gets the required items from the "required" field, if it exists
  if ('required' in params) {
    for (const type in params.required) {
      for (const rarity in params.required[type]) {
        console.log(
          `Filling Required ${rarity} ${type}, ct ${params.required[type][rarity]}`
        );

        for (let i = 0; i < params.required[type][rarity]; i++) {
          const item = getItem(
            type,
            rarity,
            items,
            params.allowDuplicates[rarity]
          );

          if (item) {
            shop.push(item);
          } else {
            console.log(
              `[WARN] Exhausted all items of type ${type}, rarity ${rarity}, continuing...`
            );
          }
        }
      }
    }
  }
}

function sampleRarity(
  rarity,
  typeProportional,
  allowDuplicates,
  items,
  typeDist
) {
  // if category proportional, we sample according to the number of items in each category
  if (typeProportional) {
    // type
    const type = sampleFromWeightedDist(typeDist[rarity]);
    // get item
    return getItem(type, rarity, items, !allowDuplicates);
  }
  // if not category proportional, we sample a category randomly, then an item
  else {
    // sometimes the returned type might not have the specified rarity item
    let item = null;
    let n = 0;

    while (!item && n < MAX_LOOPS) {
      item = getItem(getRandomKey(items), rarity, items, !allowDuplicates);

      // in extreme cases you might've exhausted all the categories so here's a
      // bit of infinite loop prevention
      n += 1;
    }

    return item;
  }
}

function sampleType(type, allowDuplicates, items) {
  // rarity is selected proportionally for type sampling
  const rarity = sampleFromWeightedDist(getCurrentTypeDist(type, items));
  return getItem(type, rarity, items, !allowDuplicates[rarity]);
}

function sampleRequiredRarities(params, shop, items, typeDist) {
  // compute existing counts
  const existing = countExistingRarities(shop);

  for (const rarity in params.ensureRarity) {
    const ct = params.ensureRarity[rarity] - existing[rarity];

    if (ct > 0) {
      console.log(`Filling required ${rarity} items, ct ${ct}`);

      for (let i = 0; i < ct; i++) {
        // sample
        const item = sampleRarity(
          rarity,
          params.typeProportional,
          params.allowDuplicates[rarity],
          items,
          typeDist
        );

        if (item) {
          shop.push(item);
        } else {
          console.log(`[WARN] Unable to add another ${rarity} item`);
        }
      }
    } else {
      console.log(`Already have required ${rarity} items`);
    }
  }
}

function sampleRequiredTypes(params, shop, items) {
  const existing = countExistingTypes(shop);

  for (type in params.ensureType) {
    const ct = params.ensureType[type] - existing[type];

    if (ct > 0) {
      console.log(`Filling required ${type} items, ct ${ct}`);

      for (let i = 0; i < ct; i++) {
        // sample
        const item = sampleType(type, params.allowDuplicates, items);

        if (item) {
          shop.push(item);
        } else {
          console.log(`[WARN] Unable to add another ${type} item`);
        }
      }
    } else {
      console.log(`Already have required ${type} items`);
    }
  }
}

function sampleRemainingItems(params, rarityDist, shop, items, typeDist) {
  console.log(`Generating remaining ${params.count - shop.length} items...`);
  let n = 0;
  while (shop.length < params.count && n < MAX_LOOPS) {
    // rarity
    const rarity = sampleFromWeightedDist(rarityDist);

    // type
    const type = params.typeProportional
      ? sampleFromWeightedDist(typeDist[rarity])
      : getRandomKey(items);

    // if rarity valid
    if (rarity) {
      const item = getItem(
        type,
        rarity,
        items,
        !params.allowDuplicates[rarity]
      );

      if (item) {
        shop.push(item);

        // reset timeout counter
        n = 0;
      }
    }

    n += 1;
  }
}

function generatePrices(params, shop) {
  // items should have a cost field
  console.log(
    `Adjusting Prices. Avg. Upcharge: ${(params.prices.upcharge * 100).toFixed(
      2
    )}%, variance: ${(params.prices.var * 100).toFixed(2)}%`
  );

  if (params.prices.alwaysMore) console.log('Always Upcharges Enabled');
  if (params.prices.alwaysLess) console.log('Always Undercharges Enabled');
  if (params.prices.alwaysMore && params.prices.alwaysLess)
    console.log('Using Fixed Prices');

  for (const item of shop) {
    // generate the diff
    let adjustment = random.normal(params.prices.upcharge, params.prices.var)();

    if (params.prices.alwaysMore) adjustment = Math.max(0, adjustment);
    if (params.prices.alwaysLess) adjustment = Math.min(0, adjustment);

    item.cost += Math.round(item.cost * adjustment);

    // above 0
    item.cost = Math.max(0, item.cost);
    item.variance = adjustment;
  }
}

function dndbLink(name) {
  const itemGuess = slugify(name, {
    replacement: '-',
    remove: /[+,'":]/g,
    lower: true
  });

  return `http://dndbeyond.com/magic-items/${itemGuess}`;
}

function printShop(shop) {
  console.log('SHOP CONTENTS');
  console.log(
    '===================================================================='
  );
  console.log('Item\t\t\tType\tRarity');

  for (const item of shop) {
    console.log(`${item.name}\t\t\t${item.type}\t${item.rarity}`);
  }
}

function exportShop(shop, file) {
  let outString =
    'Item\tType\tRarity\tCost (gp)\tPrice Variance (for DM)\tDnDBeyond Link (Guess)';

  for (const item of shop) {
    outString += `\n${item.name}\t${item.type}\t${item.rarity}\t${
      item.cost
    }\t${(item.variance * 100).toFixed(2)}%\t${dndbLink(item.name)}`;
  }

  fs.writeFileSync(file, outString);
}

async function makeShop(exportTo = null, opts = {}) {
  let params = {
    sources: [SOURCES.DMG, SOURCES.XGE],
    count: 20,
    typeProportional: true,
    allowDuplicates: {
      Common: true,
      Uncommon: true,
      Rare: false,
      'Very Rare': false,
      Legendary: false
    },
    dist: {
      Common: {
        weight: 0.25,
        var: 0.1
      },
      Uncommon: {
        weight: 0.4,
        var: 0.1
      },
      Rare: {
        weight: 0.2,
        var: 0.05
      },
      'Very Rare': {
        weight: 0.1,
        var: 0.025
      },
      Legendary: {
        weight: 0.05,
        var: 0.025
      }
    },
    prices: {
      upcharge: 0.025,
      var: 0.05,
      alwaysMore: false,
      alwaysLess: false
    },
    ensureRarity: {},
    ensureType: {},
    required: {},
    unofficialSources: []
  };

  params = merge(params, opts);

  // source override (merge probably combines arrays)
  if (opts.sources) params.sources = opts.sources;

  // generate item globals
  // load from sources - format builtin paths
  const filePaths = [];
  for (const source of params.sources) {
    filePaths.push(path.join(DATA_PATH, `${source}.txt`));
  }
  filePaths.concat(params.unofficialSources);

  // load
  const itemData = await getItems.itemsFromFiles(filePaths);
  const items = itemData.itemsByType;

  if (Object.keys(items).length === 0) {
    console.log('[ERROR] No Items Loaded, check sources and filepaths');
    return {};
  }

  const typeDist = preprocessItems(items);

  // determine item rarity counts
  const rarityDist = getRarityDistribution(params);

  // prefill items based on required field
  const shop = [];
  sampleRequiredItems(params, shop, items);

  // ensure the required item types
  sampleRequiredTypes(params, shop, items);

  // after doing the above, see if we're still missing required rarites
  // Ensure the required rarities
  sampleRequiredRarities(params, shop, items, typeDist);

  // pull the rest of the items
  sampleRemainingItems(params, rarityDist, shop, items, typeDist);

  // generate item prices for the shop
  generatePrices(params, shop);

  // printShop(shop);

  if (exportTo) {
    exportShop(shop, exportTo);
  }

  return shop;
}

async function makeShopFromPreset(preset, exportTo = null) {
  try {
    const settings = JSON.parse(fs.readFileSync(preset));
    makeShop(exportTo, settings);
  } catch (e) {
    console.log(e);
  }
}

module.exports.make = makeShop;
module.exports.makeFromPreset = makeShopFromPreset;
module.exports.SOURCES = SOURCES;

// script todos
// - pricing variance (need to price out all current items)
// - modular item loads
// - banned items
