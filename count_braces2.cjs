const fs = require('fs');
const text = fs.readFileSync('public/js/warrior.js', 'utf8');
let level = 0;
let lines = text.split('\n');
for (let i = 0; i < lines.length; i++) {
    for (let char of lines[i]) {
        if (char === '{') level++;
        if (char === '}') level--;
    }
    if (i >= 1180 && i <= 1200) {
       console.log(i + 1, level, lines[i]);
    }
}
