const fs = require('fs');

let warriorContent = fs.readFileSync('public/js/warrior.js', 'utf8');

if (!warriorContent.includes('get target()')) {
    warriorContent = warriorContent.replace('this.target = null;', 'this._target = null;\n        this.attackerCount = 0;');
    warriorContent = warriorContent.replace(/this\.target = /g, 'this.setTarget(');
    
    // We can't just replace 'this.target = ' because there are some 'if (this.target === enemy)'
    // Oh wait, doing it with a setter is much easier.
}
