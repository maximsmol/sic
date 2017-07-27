import util from 'util';
import path from 'path';
import fs from 'fs';

import * as babel from 'babel-core';


const babelify = util.promisify(::babel.transformFile);
const writeFile = util.promisify(::fs.writeFile);

const prepareDist = (...paths)=>{
  babelify(path.join(__dirname, 'src', ...paths), {
    babelrc: false,
    plugins: ['transform-class-properties', 'transform-function-bind']
  }).then(async (data)=>{
    await writeFile(path.join(__dirname, 'dist', ...paths), data.code);
  });
};

prepareDist('Module.js');
prepareDist('path.js');
prepareDist('sic.js');
prepareDist('debugGlobals.js');

babelify(path.join(__dirname, 'src', 'main.js'), {})
  .then(async (data)=>{
    await writeFile(path.join(__dirname, 'index.js'), data.code);
  });
