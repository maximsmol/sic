'use strict';

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//---


const readFile = _util2.default.promisify(_fs2.default.readFile.bind(_fs2.default));
const open = _util2.default.promisify(_fs2.default.open.bind(_fs2.default));
const write = _util2.default.promisify(_fs2.default.write.bind(_fs2.default));
const close = _util2.default.promisify(_fs2.default.close.bind(_fs2.default));
//---


const wrapper = {
  iife: {
    prefix: '(function(){',
    postfix: '})();'
  },
  module: {
    prefix: file => `moduleDB['${file}'] = (function(exports, require, module, __filename, __dirname, global) {`,
    postfix: '})'
  }
};
const wrapSrc = async (fd, file, src) => {
  await write(fd, `${wrapper.module.prefix(file)}\n`);
  await write(fd, src);
  await write(fd, `\n${wrapper.module.postfix}\n`);
};

const resolveFile = file => _path2.default.resolve(file);
//---


const argv = (0, _minimist2.default)(process.argv, {
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
(async () => {
  const fd = await open(argv.output, 'w');

  await write(fd, wrapper.iife.prefix + '\n');

  const bootstraps = ['sic.js', 'path.js', 'Module.js'];
  for (const file of bootstraps) {
    const data = await readFile(_path2.default.join(__dirname, 'dist', file));
    await write(fd, `// sic bootstrap: ${file}\n`);
    await write(fd, data);
    await write(fd, '\n');
  }

  for (const file of files) {
    const data = await readFile(file);
    await wrapSrc(fd, resolveFile(file), data);
  }

  if (argv.debug) {
    const data = await readFile(_path2.default.join(__dirname, 'dist', 'debugGlobals.js'));
    await write(fd, data);
    await write(fd, '\n');
  }

  await write(fd, `moduleExec('${resolveFile(files[0])}');\n`);
  await write(fd, wrapper.iife.postfix + '\n');

  await close(fd);
})();
/* eslint-enable no-await-in-loop */