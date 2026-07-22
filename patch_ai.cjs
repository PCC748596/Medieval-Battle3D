const fs = require('fs');
let content = fs.readFileSync('public/js/ai.js', 'utf8');

const regex = /function precalculateAICounts\(\) \{[\s\S]*?\}/;

const newCode = `function precalculateAICounts() {
    if (simulationFrame % 5 !== 0) return; // Only update every 5 frames
    const knights = battleManager.getKnights();
    const goblins = battleManager.getGoblins();
    const catapults = battleManager.getCatapults();
    
    const kLen = knights.length;
    for (let i = 0; i < kLen; i++) {
        knights[i].attackerCount = 0;
    }
    const gLen = goblins.length;
    for (let i = 0; i < gLen; i++) {
        goblins[i].attackerCount = 0;
    }
    for (let i = 0; i < catapults.length; i++) {
        catapults[i].attackerCount = 0;
    }
    for (let i = 0; i < kLen; i++) {
        const w = knights[i];
        if (w.isDead) continue;
        if (w.target && !w.target.isDead) {
            w.target.attackerCount++;
        }
    }
    for (let i = 0; i < gLen; i++) {
        const w = goblins[i];
        if (w.isDead) continue;
        if (w.target && !w.target.isDead) {
            w.target.attackerCount++;
        }
    }
}`;

content = content.replace(regex, newCode);
fs.writeFileSync('public/js/ai.js', content, 'utf8');
console.log('AI patched');
