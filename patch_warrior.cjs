const fs = require('fs');
const file = 'public/js/warrior.js';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `                } else if (distSq > actualAttackRangeSq) {
                    this.currentState = 'MOVING';
                    this.moveTowardsTarget(delta, simSpeed);
                }`;

const replaceStr = `                } else if (distSq > actualAttackRangeSq) {
                    const order = (this.formation && this.formation.brigada) ? this.formation.brigada.order : (this.faction === 'knights' ? 'DEFEND' : 'ADVANCE');
                    if (order === 'DEFEND' || order === 'WAIT' || order === 'MOVE_TO') {
                        this.setTarget(null);
                    } else {
                        this.currentState = 'MOVING';
                        this.moveTowardsTarget(delta, simSpeed);
                    }
                }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync(file, code);
    console.log("warrior.js patched successfully.");
} else {
    console.log("Could not find target string in warrior.js!");
}
