import util from 'util';
import fs from 'fs';
import path from 'path';

import minimist from 'minimist';
//---


const readFile = util.promisify(::fs.readFile);
const open = util.promisify(::fs.open);
const write = util.promisify(::fs.write);
const close = util.promisify(::fs.close);
//---


const wrapper = {
  iife: {
    prefix: '(function(){',
    postfix: '})();'
  },
  module: {
    prefix: (file)=>
      `moduleDB['${file}'] = (function(exports, require, module, __filename, __dirname, global) {`,
    postfix: '})'
  }
};
const wrapSrc = async (fd, file, src)=>{
  await write(fd, `${wrapper.module.prefix(file)}\n`);
  await write(fd, src);
  await write(fd, `\n${wrapper.module.postfix}\n`);
};

const resolveFile = (file)=>
  path.resolve(file);
//---


const argv = minimist(process.argv, {
  string: ['output'],
  boolean: ['debug'],
  alias: {
    debug: 'd',
    output: 'o'
  },
  default: {
    output: 'sic.js'
  }
});
const files = argv._.slice(2);
/* eslint-disable no-await-in-loop */
// file output needs one-by-one
(async ()=>{
  const fd = await open(argv.output, 'w');

  await write(fd, wrapper.iife.prefix+'\n');

  const bootstraps = [
    'sic.js',
    'path.js',
    'Module.js'
  ];
  for (const file of bootstraps) {
    const data = await readFile(path.join(__dirname, 'dist', file));
    await write(fd, `// sic bootstrap: ${file}\n`);
    await write(fd, data);
    await write(fd, '\n');
  }

  for (const file of files) {
    const data = await readFile(file);
    await wrapSrc(fd, resolveFile(file), data);
  }

  if (argv.debug) {
    const data = await readFile(path.join(__dirname, 'dist', 'debugGlobals.js'));
    await write(fd, data);
    await write(fd, '\n');
  }

  await write(fd, `moduleExec('${resolveFile(files[0])}');\n`);
  await write(fd, wrapper.iife.postfix+'\n');

  await close(fd);
})();
/* eslint-enable no-await-in-loop */
