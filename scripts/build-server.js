/**
 * Build Server
 */

const fs = require('fs-extra');
const path = require('path');
const rollup = require('rollup');


const TRANSPILED_DIR = path.join(__dirname, '../build/transpiled-server');
const ENTRY_FILE = path.join(TRANSPILED_DIR, 'server/index.js');
const DIST_DIR = path.join(__dirname, '../build/dist/server');
const DIST_FILE = path.join(DIST_DIR, 'index.js');


function bundleCompiler() {
  console.log('bundling server...');

  rollup.rollup({
    entry: ENTRY_FILE

  }).then(bundle => {

    // copy over all the .d.ts file too
    fs.copy(path.dirname(ENTRY_FILE), DIST_DIR, {
      filter: (src) => {
        return src.indexOf('.js') === -1 && src.indexOf('.spec.') === -1;
      }
    });

    // bundle up the compiler into one js file
    bundle.write({
      format: 'cjs',
      dest: DIST_FILE

    }).then(() => {
      console.log(`bundled server: ${DIST_FILE}`);
    });

  });
}


bundleCompiler();


process.on('exit', (code) => {
  fs.removeSync(TRANSPILED_DIR);
});
