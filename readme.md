# make-item-shop

A node module that generates magic item shops for Dungeons and Dragons 5e.

Sample Output:

| Item               | Type   | Rarity    | Cost (gp) | Price Variance (for DM) | DnDBeyond Link (Guess)                              |
| ------------------ | ------ | --------- | --------- | ----------------------- | --------------------------------------------------- |
| Armor, +3          | Armor  | Legendary | 55025     | 10.05%                  | http://dndbeyond.com/magic-items/armor-3            |
| Mithral Armor      | Armor  | Uncommon  | 290       | -3.18%                  | http://dndbeyond.com/magic-items/mithral-armor      |
| Nine Lives Stealer | Weapon | Very Rare | 54330     | 8.66%                   | http://dndbeyond.com/magic-items/nine-lives-stealer |
| Dwarven Thrower    | Weapon | Very Rare | 42081     | 0.19%                   | http://dndbeyond.com/magic-items/dwarven-thrower    |

Thanks to https://donjon.bin.sh/5e/magic_items/ for providing the seed data for the item
databases in this script.

## Installation

Clone the repository and run either `yarn install` or `npm install`. Yarn has been the development package manager,
but this isn't really a complex script so default `npm` should work as well. Eventually this may become a module in
`npm` itself, but I have a few additional features to add before pushing it there.

## Usage

The script can be used from the command line with the `cmd.js` file or via module with the `index.js`. The command line
format will be detailed here, as the module version uses the same inputs.

```
./cmd.js [preset file] [output file]
```

Item shops are sampled from an item rarity distribution that is specified in the preset file. Example presets are
in the `presets/` folder of this repository. The script will output a **tab-separated** .txt file that can be imported
to most spreadsheet applications.

The script will also try to guess what the DnDBeyond link for the item is.
It's right most of the time, however, some items may have the wrong link due to the way
DnDBeyond clusters their items (Potion of Greater Healing will not have a proper link generated, for instance).

## FAQ

Well, not frequent, but anticipated questions.

### How does it work?

Well enough? Dunno, wrote it in about a day. The script works in a few phases:

1. Load the item databases (see `src/db`)
2. Determine what the item rarity distribution should be
3. Add all items specified by user constraints (see fields `ensureRarity`, `ensureType`, `required`)
4. Sample remaining items (if any) from the rarity distribution by
   - first selecting a type (either weighted by the size of that set or uniformly)
   - then selecting a rarity following the given distribution
   - then picking an item uniformly at random with or without replacement (see `allowDuplicates`)
5. Adjust prices according to the prices I somewhat arbitrarily picked and the `prices` field.
6. Exports and returns

### I don't like your prices.

Not a question, but understood. Prices are based roughly on the ranges specified
by the Dungeon Master's Guide. If you're used to the prices in the Sane Magic Items guide,
these will be different. I'm working on a way to tell the script to use a price table
that will override my arbitrary defaults and will update this question when I have
a solution. You can also just delete that column and use your own.

### How do I add my own Items to the Pool?

Write a tab-separated text file and provide the file path(s) in the `unofficialSources` field.
The required columns are: `name`, `type`, `rarity`, `attunement required`, `notes`, `source`, `price`. See `src/db` for examples. Rarity must be one of: `{Common, Uncommon, Rare, Very Rare, Legendary}`, and Type must be one of `{ Armor, Potion, Ring, Rod, Scroll, Staff, Wand, Weapon, Wondrous Item}`.

### How can I ban items?

Right now, you can't. But I'm working on it.
Eventually you'll be able to give the script a list of
banned items in your preset file, and they'll be removed from the item
pool before the script samples anything.

### Can I add new item types or rarities?

At the moment, no. But I can probably make this happen eventually.

### The fact that 'Very Rare' is an object key is infuriating

Also not a question, but yeah I just didn't want to go replace
that term in the input file you know?

### Wait doesn't `ensureRarity` make it so the output distribution isn't eactly close to the input?

This is correct in regards to that field and a much too mathematically inclined question to be frequent.
I might go back and make an adaptive distribution
that will take user constraints into account alongside the desired rarity distribution
at some point, but it's not high on the to-do list.

## Preset fields

The following are the root fields used in the presets file

### sources

String array. List of pre-built sources included with the script.

Accepted values (currently)

- `dmg` (Dungeon Master's Guide)
- `xge` (Xanathar's Guide to Everything)

### count

Number of items to generate. The actual number of items generated may
be more than this if you do weird things with `ensureRarity`, `ensureType`,
or `required`.

### typeProportional

Boolean. Settings to true will sample items according to their relative proportions in the loaded item databases. So if there are more `Wonderous Items` than `Rings`, the
`Wonderous Items` will show up more frequently. Disabling this will sample all types of items with equal probability.

### allowDuplicates

Object. Keys are one of the five rarities: `{Common, Uncommon, Rare, Very Rare, Legendary}`.
Values are booleans. If set to true, the sampler will
be allowed to pull items more than once for the given rarity.

Sample configuration for `allowDuplicates`:

```json
"allowDuplicates": {
  "Common": true,
  "Uncommon": true,
  "Rare": false,
  "Very Rare": false,
  "Legendary": false
}
```

### dist

Object. The mean and variance of the item distribution that gets generated
by the script. Every time the script runs, the `weight` will be modified by a
Normal distribution with variance specified by `var`. If you want to keep the
distribution constant between runs, set `var` to `0`. The `weight`s don't need
to add up to 1, the script will normalize proportions before sampling.

Sample configuration for `dist`:

```json
"dist": {
  "Common": {
    "weight": 0.2,
    "var": 0.1
  },
  "Uncommon": {
    "weight": 0.46,
    "var": 0.1
  },
  "Rare": {
    "weight": 0.3,
    "var": 0.1
  },
  "Very Rare": {
    "weight": 0.1,
    "var": 0.02
  },
  "Legendary": {
    "weight": 0.03,
    "var": 0.01
  }
}
```

### prices

Object. Contains the following fields:

- `upcharge`
  - Average percentage more/less that this shop sells items for relative to the list price.
- `var`
  - Variance of the upcharge. Price upcharge follows a normal distribution. Set to 0 to always increase/decrease by the percentage listed in `upcharge`
- `alwaysMore`
  - Boolean. Set to true to always have prices greater than or equal to the list price
- `alwaysLess`
  - Boolean. Set to true to always have prices less than or equal to the list price. Note that if both `alwaysLess` and `alwaysMore` are set to true, the generated prices will always be equal to list price.

Sample configuration for `prices`:

```json
"prices": {
  "upcharge": 0.05,
  "var": 0.05,
  "alwaysMore": false,
  "alwaysLess": false
}
```

### ensureRarity

Object. Keys are one of the five rarities: `{Common, Uncommon, Rare, Very Rare, Legendary}`. Values are integers indicating how many of each rarity you need.
You cannot choose what the item type is from this field. To do that, see `required`.

Sample configuration for `ensureRarity`:

```json
"ensureRarity" : {
  "Very Rare": 2,
  "Legendary": 1,
}
```

### ensureType

Object. Keys are one of the item types: `{ Armor, Potion, Ring, Rod, Scroll, Staff, Wand, Weapon, Wondrous Item}`. Values are integers indicating how many of each rarity you need.
Item rarities are sampled from the distribution given in `dist`.

Sample configuration for `ensureType`:

```json
"ensureType" : {
  "Armor": 1,
  "Rod": 5
}
```

### required

Object. This is for when you need items of a specific type and rarity.
Specified by type then by rarity then by count. See the sample configuration.

Sample configuration for `required`:

```json
"required": {
  "Armor": {
    "Rare": 1
  },
  "Rod": {
    "Very Rare": 1
  }
}
```

### unofficialSources

String array. A list of paths to tab-separated files with one item per line.
These items will be loaded into the item pool and treated like any other item.

### banned

A string array of banned items by name. Name must match exactly.

Sample configuration for `banned`:

```json
"banned": [
  "Ring of Three Wishes",
  "Deck of Many Things",
  "Luck Blade",
  "Ring of Djinni Summoning"
]
```

## Default configuration

If you don't provide a preset file, the script will use the following as the default values:

```js
{
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
}
```
