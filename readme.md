# make-item-shop

A node module that generates magic item shops for Dungeons and Dragons 5e (by default).

Sample Output:

| Item               | Type   | Rarity    | Cost (gp) | Price Variance (for DM) | DnDBeyond Link (Guess)                              |
| ------------------ | ------ | --------- | --------- | ----------------------- | --------------------------------------------------- |
| Armor, +3          | Armor  | Legendary | 55025     | 10.05%                  | http://dndbeyond.com/magic-items/armor-3            |
| Mithral Armor      | Armor  | Uncommon  | 290       | -3.18%                  | http://dndbeyond.com/magic-items/mithral-armor      |
| Nine Lives Stealer | Weapon | Very Rare | 54330     | 8.66%                   | http://dndbeyond.com/magic-items/nine-lives-stealer |
| Dwarven Thrower    | Weapon | Very Rare | 42081     | 0.19%                   | http://dndbeyond.com/magic-items/dwarven-thrower    |

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
in the `presets/` folder of this repository.
