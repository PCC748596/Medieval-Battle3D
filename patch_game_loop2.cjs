const fs = require('fs');
let content = fs.readFileSync('public/js/game-loop.js', 'utf8');

const regex = /const all = \[\.\.\.battleManager\.getKnights\(\), \.\.\.battleManager\.getGoblins\(\), \.\.\.battleManager\.getDeadWarriors\(\), \.\.\.battleManager\.getArrows\(\), \.\.\.activeParticles, \.\.\.battleManager\.getCatapults\(\)\];\s*for \(let i = 0; i < all\.length; i\+\+\) \{\s*const w = all\[i\];/;

const newCode = `const lists = [battleManager.getKnights(), battleManager.getGoblins(), battleManager.getDeadWarriors(), battleManager.getArrows(), activeParticles, battleManager.getCatapults()];
    for (let l = 0; l < lists.length; l++) {
        const list = lists[l];
        for (let i = 0; i < list.length; i++) {
            const w = list[i];`;

content = content.replace(regex, newCode);
// wait, I also need to close the outer loop
const endRegex = /im\.setColorAt\(idx, _tmpColorIM\);\s*im\.count\+\+;\s*\}\s*\}\);\s*\}/;
const newEndCode = `im.setColorAt(idx, _tmpColorIM);
                im.count++;
            }
        });
        }
    }`;
content = content.replace(endRegex, newEndCode);
fs.writeFileSync('public/js/game-loop.js', content, 'utf8');
