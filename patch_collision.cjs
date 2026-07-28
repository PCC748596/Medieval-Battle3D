const fs = require('fs');
const file = 'public/js/collision.js';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `    if (warriorOrder === 'DEFEND' || warriorOrder === 'WAIT') {
        if (isMeleeOrDagger) {
            maxRing = 3; // Raio defensivo de ~15m para combate aproximado sem romper formação
        }
    }`;

const replaceStr = `    if (warriorOrder === 'DEFEND' || warriorOrder === 'WAIT' || warriorOrder === 'MOVE_TO') {
        if (isMeleeOrDagger) {
            maxRing = 3; // Raio defensivo de ~15m para não desviar do caminho / formação
        } else {
            maxRing = Math.ceil((warrior.attackRange || 60) / window.GRID_CELL_SIZE); // Arqueiros não caçam além do seu alcance
        }
    }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync(file, code);
    console.log("collision.js patched successfully.");
} else {
    console.log("Could not find target string in collision.js!");
}
