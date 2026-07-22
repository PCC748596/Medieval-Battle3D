const fs = require('fs');
let content = fs.readFileSync('public/js/warrior.js', 'utf8');

const targetContent = `        // Ajuste de altura no terreno e limite de arena
        if (this.lastVelocity.lengthSq() > 0.0001 || this.knockbackTimer > 0 || this.launchVY !== 0) {
            this.terrainY = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        }`;

const newContent = `        // Ajuste de altura no terreno e limite de arena
        if (this.lastVelocity.lengthSq() > 0.0001 || this.knockbackTimer > 0 || this.launchVY !== 0) {
            if ((simulationFrame + this.uid) % 3 === 0 || this.launchVY !== 0) {
                this.terrainY = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
            }
        }`;

if (content.includes(targetContent)) {
    content = content.replace(targetContent, newContent);
    fs.writeFileSync('public/js/warrior.js', content, 'utf8');
    console.log('Terrain height patched');
} else {
    console.log('Target content not found.');
}
