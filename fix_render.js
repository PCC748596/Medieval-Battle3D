const fs = require('fs');
let code = fs.readFileSync('public/js/game-loop.js', 'utf8');

const renderListBody = `function renderList(list) {
    const len = list.length;
    for (let i = 0; i < len; i++) {
        const w = list[i];
        const isWarrior = (w.constructor.name === 'Warrior');
        
        let mesh = isWarrior ? null : w.mesh;
        let pos = isWarrior ? w : w.mesh.position;
        let visible = isWarrior ? w.visible : w.mesh.visible;

        if (!visible) {
            if (w.lodLevel !== undefined && w.lodLevel > 1) continue;
            if (w.lodLevel === undefined) continue;
        }

        // CPU Frustum Culling
        _sphere.set(pos, (w.radius || 0.8) + 2.5);
        if (!_frustum.intersectsSphere(_sphere)) {
            continue;
        }

        if (isWarrior) {
            mesh = templateMeshes[w.faction][w.role];
            if (!mesh) continue;
            mesh.position.set(w.x, w.y, w.z);
            mesh.rotation.set(w.rotX || 0, w.rotY || 0, w.rotZ || 0);
            mesh.scale.set(w.scale || 1, w.scale || 1, w.scale || 1);
            if (w.applyPoseToDummy) w.applyPoseToDummy(mesh);
        }

        mesh.updateMatrixWorld(true);
        const isFlashed = w.flashTimer > 0;

        let subMeshes = isWarrior ? mesh.subMeshes : w.subMeshes;
        if (!subMeshes) {
            subMeshes = [];
            mesh.traverse(child => {
                if (child.isMesh) subMeshes.push(child);
            });
            if (isWarrior) mesh.subMeshes = subMeshes;
            else w.subMeshes = subMeshes;
        }

        const subLen = subMeshes.length;
        for (let m = 0; m < subLen; m++) {
            const child = subMeshes[m];
            if (!child.visible) continue;
            
            const im = imAllocator.getIM(child.geometry, child.material);
            const idx = im.count;
            if (idx >= im.instanceMatrix.count) continue;

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
    }
}`;

code = code.replace(/function renderList\(list\) \{[\s\S]*?\}\n\nfunction renderParticles\(\)/, renderListBody + '\n\nfunction renderParticles()');

fs.writeFileSync('public/js/game-loop.js', code);
