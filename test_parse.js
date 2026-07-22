const fs = require('fs');
const code = fs.readFileSync('public/js/warrior.js', 'utf8');
const vm = require('vm');
const script = new vm.Script(code);
