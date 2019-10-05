const Shop = require('./src/makeShop');

if (process.argv.length < 4) {
  console.log('Usage: node ./cmd.js [config file] [output file]');
  return;
}

(async () => {
  try {
    await Shop.makeFromPreset(process.argv[2], process.argv[3]);
  } catch (e) {
    console.log(e);
  }
})();
