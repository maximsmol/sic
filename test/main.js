var test = require('./hi.js');
var react = require('./node_modules/react/dist/react.min.js');

console.log(test.abc);

global.react = react;
