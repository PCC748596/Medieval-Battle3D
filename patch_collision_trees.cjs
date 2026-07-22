const fs = require('fs');
let content = fs.readFileSync('public/js/collision.js', 'utf8');

const regex = /\/\/ 2\. Colisões com árvores de pé — pré-filtra por AABB([\s\S]*?)    \}\n\}/;

const newContent = `// 2. Colisões com árvores de pé — otimizado com spatial grid lazy-loaded
    if (window._lastTreeCount !== treePositions.length || !window._treeGrid) {
        window._treeGridSize = 20;
        window._treeGridCols = Math.ceil((1000 + 100) / window._treeGridSize);
        window._treeGridRows = Math.ceil((1000 + 100) / window._treeGridSize);
        window._treeGrid = Array.from({ length: window._treeGridCols * window._treeGridRows }, () => []);
        const halfX = 500 + 50;
        const halfZ = 500 + 50;
        for (let i = 0; i < treePositions.length; i++) {
            const tree = treePositions[i];
            const col = Math.max(0, Math.min(window._treeGridCols - 1, Math.floor((tree.x + halfX) / window._treeGridSize)));
            const row = Math.max(0, Math.min(window._treeGridRows - 1, Math.floor((tree.z + halfZ) / window._treeGridSize)));
            const idx = col + row * window._treeGridCols;
            window._treeGrid[idx].push(tree);
        }
        window._lastTreeCount = treePositions.length;
    }

    const minDistTree = r + 0.65;
    const minDistTreeSq = minDistTree * minDistTree;
    
    const halfX = 500 + 50;
    const halfZ = 500 + 50;
    const wCol = Math.max(0, Math.min(window._treeGridCols - 1, Math.floor((px + halfX) / window._treeGridSize)));
    const wRow = Math.max(0, Math.min(window._treeGridRows - 1, Math.floor((pz + halfZ) / window._treeGridSize)));
    
    for (let cOff = -1; cOff <= 1; cOff++) {
        for (let rOff = -1; rOff <= 1; rOff++) {
            const c = wCol + cOff;
            const r = wRow + rOff;
            if (c < 0 || c >= window._treeGridCols || r < 0 || r >= window._treeGridRows) continue;
            
            const cell = window._treeGrid[c + r * window._treeGridCols];
            for (let i = 0; i < cell.length; i++) {
                const tree = cell[i];
                const dx = px - tree.x;
                const dz = pz - tree.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < minDistTreeSq) {
                    const dist = Math.sqrt(distSq);
                    if (dist > 0.0001) {
                        const overlap = minDistTree - dist;
                        warrior.mesh.position.x += (dx / dist) * overlap;
                        warrior.mesh.position.z += (dz / dist) * overlap;
                    } else {
                        warrior.mesh.position.x += (Math.random() - 0.5) * 0.15;
                        warrior.mesh.position.z += (Math.random() - 0.5) * 0.15;
                    }
                }
            }
        }
    }
}`;

content = content.replace(regex, newContent);
fs.writeFileSync('public/js/collision.js', content, 'utf8');
console.log('Collision patch successful.');
