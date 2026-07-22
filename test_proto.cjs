const fs = require('fs');
const code = fs.readFileSync('public/js/warrior.js', 'utf8');
const lines = code.split('\n');
const methods = [];
let inClass = false;
for (let line of lines) {
    if (line.match(/^class Warrior/)) inClass = true;
    if (inClass && line.match(/^    ([a-zA-Z0-9_]+)\(/)) {
        methods.push(line.match(/^    ([a-zA-Z0-9_]+)\(/)[1]);
    }
}
console.log("Methods:", methods);
