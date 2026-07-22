const fs = require('fs');
let content = fs.readFileSync('public/js/warrior.js', 'utf8');

const regex = /\/\/ Alvos: guerreiros inimigos \(usa distSq para evitar sqrt\)\s*for \(let i = 0; i < opponents\.length; i\+\+\) \{/;

const newCode = `// Alvos: guerreiros inimigos (usa distSq para evitar sqrt) - Otimizado para amostra aleatória
            const checks = Math.min(opponents.length, 45);
            for (let k = 0; k < checks; k++) {
                const i = (opponents.length <= 45) ? k : Math.floor(Math.random() * opponents.length);`;

content = content.replace(regex, newCode);

const deadRegex = /let allOpponentsDead = true;\s*for \(let i = 0; i < opponents\.length; i\+\+\) \{\s*if \(\!opponents\[i\]\.isDead\) \{\s*allOpponentsDead = false;\s*break;\s*\}\s*\}/;
const deadNewCode = `let allOpponentsDead = (opponents.length === 0);`;

content = content.replace(deadRegex, deadNewCode);

fs.writeFileSync('public/js/warrior.js', content, 'utf8');
console.log('AI loop patched');
