const fs = require('fs');
let content = fs.readFileSync('public/js/game-loop.js', 'utf8');

const targetContent = `    const all = [...battleManager.getKnights(), ...battleManager.getGoblins(), ...battleManager.getDeadWarriors(), ...battleManager.getArrows(), ...activeParticles, ...battleManager.getCatapults()];
    for (let i = 0; i < all.length; i++) {
        const w = all[i];
        if (!w.mesh.visible) {
            if (w.lodLevel !== undefined && w.lodLevel > 1) continue;
            if (w.lodLevel === undefined) continue;
        }
        w.mesh.updateMatrixWorld(true);
        const isFlashed = w.flashTimer > 0;
        w.mesh.traverse(child => {
            if (child.isMesh && child.visible) {
                const im = imAllocator.getIM(child.geometry, child.material);
                const idx = im.count;
                if (idx >= im.instanceMatrix.count) return;
                im.setMatrixAt(idx, child.matrixWorld);
                if (!im.instanceColor) {
                    const colors = new Float32Array(im.instanceMatrix.count * 3);
                    colors.fill(1.0);
                    im.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
                    im.instanceColor.setUsage(THREE.DynamicDrawUsage);
                }
                if (isFlashed && (child.name === 'head' || child.name === 'torso' || child.name === 'armL' || child.name === 'armR' || child.name === 'legL' || child.name === 'legR')) {
                    _tmpColorIM.setHex(0xffaaaa);
                } else if (w.baseColor) {
                    _tmpColorIM.copy(w.baseColor);
                } else {
                    _tmpColorIM.setHex(0xffffff);
                }
                im.setColorAt(idx, _tmpColorIM);
                im.count++;
            }
        });
    }`;

const newContent = `    const lists = [battleManager.getKnights(), battleManager.getGoblins(), battleManager.getDeadWarriors(), battleManager.getArrows(), activeParticles, battleManager.getCatapults()];
    
    for (let l = 0; l < lists.length; l++) {
        const list = lists[l];
        for (let i = 0; i < list.length; i++) {
            const w = list[i];
            if (!w.mesh.visible) {
                if (w.lodLevel !== undefined && w.lodLevel > 1) continue;
                if (w.lodLevel === undefined) continue;
            }
            w.mesh.updateMatrixWorld(true);
            const isFlashed = w.flashTimer > 0;
            w.mesh.traverse(child => {
                if (child.isMesh && child.visible) {
                    const im = imAllocator.getIM(child.geometry, child.material);
                    const idx = im.count;
                    if (idx >= im.instanceMatrix.count) return;
                    im.setMatrixAt(idx, child.matrixWorld);
                    if (!im.instanceColor) {
                        const colors = new Float32Array(im.instanceMatrix.count * 3);
                        colors.fill(1.0);
                        im.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
                        im.instanceColor.setUsage(THREE.DynamicDrawUsage);
                    }
                    if (isFlashed && (child.name === 'head' || child.name === 'torso' || child.name === 'armL' || child.name === 'armR' || child.name === 'legL' || child.name === 'legR')) {
                        _tmpColorIM.setHex(0xffaaaa);
                    } else if (w.baseColor) {
                        _tmpColorIM.copy(w.baseColor);
                    } else {
                        _tmpColorIM.setHex(0xffffff);
                    }
                    im.setColorAt(idx, _tmpColorIM);
                    im.count++;
                }
            });
        }
    }`;

if (content.includes(targetContent)) {
    content = content.replace(targetContent, newContent);
    fs.writeFileSync('public/js/game-loop.js', content, 'utf8');
    console.log('File patched');
} else {
    console.log('Target content not found.');
}
