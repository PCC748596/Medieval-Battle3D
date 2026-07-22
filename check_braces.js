const fs = require('fs');
const code = fs.readFileSync('public/js/warrior.js', 'utf8');

let count = 0;
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        if (line[j] === '{') count++;
        if (line[j] === '}') count--;
    }
    if (count < 0) {
        console.log(`Unbalanced '}' at line ${i+1}`);
        process.exit(1);
    }
}
console.log('Final count:', count);
