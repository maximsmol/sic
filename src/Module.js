/* globals moduleDB, path, window */

const nodejsCore = [
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'crypto',
  'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'net', 'os',
  'path', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'string_decoder', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib'
];

let moduleExec = null; // forward declaration
class Module {
  constructor(dirname, filename, parent) {
    this.id = this.filename;
    this.loaded = false;

    this.dirname = dirname;
    this.filename = filename;

    this.exports = {};
    this.module = this;

    this.parent = parent;
    this.children = [];
  }

  exec(fn) {
    fn(this.exports, ::this.require, this.module, this.filename, this.dirname, window);
  }

  requireFile(file) {
    if (moduleDB.hasOwnProperty(file))
      return moduleExec(file, this);
    if (moduleDB.hasOwnProperty(file+'.js'))
      return moduleExec(file+'.js', this);
    if (moduleDB.hasOwnProperty(file+'.json'))
      throw new Error('wrong env. no require json'); // todo
    if (moduleDB.hasOwnProperty(file+'.node'))
      throw new Error('wrong env. no binary addons');
    return null;
  }
  requireDir(file) {
    if (moduleDB.hasOwnProperty(path.join(file, 'package.json')))
      throw new Error('wrong env. no require dir via package.json'); // todo
    return null;
  }
  requireIndex(file) {
    if (moduleDB.hasOwnProperty(path.join(file, 'index.js')))
      throw moduleExec(path.join(file, 'index.js'), this);
    if (moduleDB.hasOwnProperty(path.join(file, 'index.json')))
      throw new Error('wrong env. no require index.json from dir'); // todo
    if (moduleDB.hasOwnProperty(path.join(file, 'index.node')))
      throw new Error('wrong env. no require index binary addon from dir');
    return null;
  }

  requireNodeModules(file, base) {
    const dirs = [];
    do {
      if (path.basename(base) !== 'node_modules')
        dirs.push(path.join(base, 'node_modules'));
      base = path.dirname(base);
    } while (base !== '/');

    let res = null;
    for (const d of dirs) {
      if (res == null)
        res = this.requireFile(path.join(d, file));
      if (res == null)
        res = this.requireDir(path.join(d, file));

      if (res != null) break;
    }
    return res;
  }

  require(query) {
    if (query == null)
      throw new Error('missing path');
    if (typeof query !== 'string')
      throw new Error('path must be a string');

    if (nodejsCore.indexOf(query) !== -1)
      throw new Error('wrong env. no node');

    let base = this.dirname;
    if (query[0] === '/')
      base = '/';
    const file = path.resolve(path.join(base, query));

    let child = null;
    if (query[0] === '/' ||
        query.startsWith('./') ||
        query.startsWith('../')) {
      if (child == null)
        child = this.requireFile(file);
      if (child == null)
        child = this.requireDir(file);
      if (child == null)
        child = this.requireIndex(file);
      if (child == null)
        child = this.requireNodeModules(file, base);
    }

    if (child == null)
      throw new Error('Cannot find module \''+query+'\'');

    this.children.push(child);
    return child.exports;
  }
}

moduleExec = function(file, parent) {
  const module = new Module(path.dirname(file), file, parent);
  module.exec(moduleDB[file]);
  return module;
};
