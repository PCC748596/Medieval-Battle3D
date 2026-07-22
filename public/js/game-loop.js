// --- 10. LOOP PRINCIPAL DE RENDERIZAÇÃO & FRAMEWORK ---
let lastTime = performance.now();
let fpsTimer = 0;
let fpsFrames = 0;

const imAllocator = {
    meshes: [],
    getIM: function (geometry, material) {
        for (let i = 0; i < this.meshes.length; i++) {
            if (this.meshes[i].geometry === geometry && this.meshes[i].material === material) {
                return this.meshes[i];
            }
        }
        const im = new THREE.InstancedMesh(geometry, material, 15000);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.count = 0;
        scene.add(im);
        this.meshes.push(im);
        return im;
    },
    resetCounts: function () {
        for (let i = 0; i < this.meshes.length; i++) {
            this.meshes[i].count = 0;
        }
    },
    updateMatrices: function () {
        for (let i = 0; i < this.meshes.length; i++) {
            if (this.meshes[i].count > 0) {
                this.meshes[i].instanceMatrix.needsUpdate = true;
                if (this.meshes[i].instanceColor) {
                    this.meshes[i].instanceColor.needsUpdate = true;
                }
            }
        }
    }
};

const _tmpColorIM = new THREE.Color();
const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();
const _sphere = new THREE.Sphere();

function renderList(list) {
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
}

function renderParticles() {
    const poolArray = ParticlePool.pool;
    const len = poolArray.length;
    for (let i = 0; i < len; i++) {
        const w = poolArray[i];
        if (w.life <= 0) continue;

        if (!w.mesh.visible) {
            if (w.lodLevel !== undefined && w.lodLevel > 1) continue;
            if (w.lodLevel === undefined) continue;
        }

        // CPU Frustum Culling for particles
        _sphere.set(w.mesh.position, 1.0);
        if (!_frustum.intersectsSphere(_sphere)) {
            continue;
        }

        w.mesh.updateMatrixWorld(false);
        const isFlashed = w.flashTimer > 0;

        if (!w.visibleSubMeshes) {
            if (!w.subMeshes) {
                w.subMeshes = [];
                w.mesh.traverse(child => {
                    if (child.isMesh) w.subMeshes.push(child);
                });
            }
            w.visibleSubMeshes = [];
            const subLen = w.subMeshes.length;
            for (let m = 0; m < subLen; m++) {
                if (w.subMeshes[m].visible) {
                    w.visibleSubMeshes.push(w.subMeshes[m]);
                }
            }
        }

        const subLen = w.visibleSubMeshes.length;
        for (let m = 0; m < subLen; m++) {
            const child = w.visibleSubMeshes[m];
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
}

function renderWarriorsInstanced() {
    // Update Camera Frustum once per frame
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    imAllocator.resetCounts();

    renderList(battleManager.getKnights());
    renderList(battleManager.getGoblins());
    renderList(battleManager.getDeadWarriors());
    renderList(battleManager.getArrows());
    renderParticles();
    renderList(battleManager.getCatapults());

    imAllocator.updateMatrices();
}

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (!battleManager.isPaused() && soundEnabled) {
        const isBattleOver = (battleManager.getKnights().length === 0 || battleManager.getGoblins().length === 0) && simulationFrame > 10;
        if (isBattleOver) {
            stopDrumLoop();
            stopContinuousCrowdRoar();
            if (!battleManager.isBattleEnded()) {
                battleManager.setBattleEnded(true);
                let winner = 'draw';
                if (battleManager.getKnights().length > 0) winner = 'knights';
                else if (battleManager.getGoblins().length > 0) winner = 'goblins';
                
                const nameKnights = currentTheme === 'napoleonic' || currentTheme === 'napoleonic_3d' ? 'Franceses' : 'Cavaleiros';
                const nameGoblins = currentTheme === 'napoleonic' || currentTheme === 'napoleonic_3d' ? 'Britânicos' : 'Goblins';
                
                HUD.showBattleEndModal(winner, totalDeadKnights, totalDeadGoblins, nameKnights, nameGoblins);
            }
        } else {
            startDrumLoop();
            startContinuousCrowdRoar();
        }
    }

    fpsFrames++;
    fpsTimer += delta;
    if (fpsTimer >= 1.0) {
        window.currentFPS = Math.round(fpsFrames / fpsTimer);
        HUD.updateFPS(window.currentFPS);
        fpsFrames = 0;
        fpsTimer = 0;
    }

    if (!battleManager.isPaused()) {
        if (cinematicZoomPauseTimer > 0) {
            cinematicZoomPauseTimer -= delta;
        } else {
            cinematicTime += delta * 1000;
        }
        simulationFrame++;
        const dt = delta;
        precalculateAICounts();

        const knights = battleManager.getKnights();
        const goblins = battleManager.getGoblins();
        const arrows = battleManager.getArrows();
        const deadWarriors = battleManager.getDeadWarriors();
        const catapults = battleManager.getCatapults();
        const simulationSpeed = battleManager.getSimulationSpeed();

        const cameraPos = camera.position;
        const maxRadius = Math.max(sizeX, sizeZ) * 0.65;
        const medDist = Math.max(180, maxRadius * 0.70);
        const maxDist = Math.max(250, maxRadius * 0.95);
        const medDistSq = medDist * medDist;
        const maxDistSq = maxDist * maxDist;

        if (window.populateSpatialGrid) {
            window.populateSpatialGrid();
        }

        for (let i = knights.length - 1; i >= 0; i--) {
            knights[i].updateLOD(cameraPos, maxDistSq, medDistSq);
            knights[i].update(goblins, dt, simulationSpeed);
        }

        for (let i = goblins.length - 1; i >= 0; i--) {
            goblins[i].updateLOD(cameraPos, maxDistSq, medDistSq);
            goblins[i].update(knights, dt, simulationSpeed);
        }

        resolveWarriorCollisions();

        for (let i = arrows.length - 1; i >= 0; i--) {
            const arrow = arrows[i];
            arrow.update(dt, simulationSpeed);
            if (arrow.isDead) {
                ArrowPool.release(arrow);
                arrows.splice(i, 1);
            }
        }

        for (let i = deadWarriors.length - 1; i >= 0; i--) {
            deadWarriors[i].updateLOD(cameraPos, maxDistSq, medDistSq);
            const completelySunk = deadWarriors[i].fadeAndSink(dt * simulationSpeed);
            if (completelySunk) {
                deadWarriors.splice(i, 1);
            }
        }

        // Animação das nuvens (deriva pelo céu)
        for (let i = 0; i < clouds.length; i++) {
            clouds[i].x += clouds[i].speedX * dt * simulationSpeed;
            clouds[i].z += clouds[i].speedZ * dt * simulationSpeed;

            // Reaparece do outro lado se sair muito do mapa
            if (clouds[i].x > 1000) clouds[i].x = -1000;
            if (clouds[i].x < -1000) clouds[i].x = 1000;
            if (clouds[i].z > 1000) clouds[i].z = -1000;
            if (clouds[i].z < -1000) clouds[i].z = 1000;
        }
        if (clouds.length > 0) {
            updateCloudMatrices();
        }
        updateRain(dt);
        updateLightning(dt);

        updateParticles(dt);

        for (let i = 0; i < catapults.length; i++) {
            const c = catapults[i];
            if (c.isDead) continue;
            const opp = armies[c.faction].enemies;
            c.updateLOD(cameraPos, maxDistSq);
            c.update(opp, dt, simulationSpeed);
        }

        for (let i = boulders.length - 1; i >= 0; i--) {
            boulders[i].update(dt, simulationSpeed);
            if (boulders[i].isDead) {
                BoulderPool.release(boulders[i]);
                boulders.splice(i, 1);
            }
        }
    }

    if (cameraMode !== 'cinematic') {
        let moved = false;
        let rotated = false;

        _tmpVec3C.set(controls.target.x - camera.position.x, 0, controls.target.z - camera.position.z).normalize();
        const forward = _tmpVec3C;

        _tmpVec3D.set(forward.z, 0, -forward.x);
        const right = _tmpVec3D;

        const moveSpeed = 45 * delta;
        const rotSpeed = 1.8 * delta;

        if (keysPressed['w'] || keysPressed['a'] || keysPressed['s'] || keysPressed['d']) {
            _tmpVec3E.set(0, 0, 0);
            if (keysPressed['w']) _tmpVec3E.add(forward);
            if (keysPressed['s']) _tmpVec3E.addScaledVector(forward, -1);
            if (keysPressed['a']) _tmpVec3E.add(right);
            if (keysPressed['d']) _tmpVec3E.addScaledVector(right, -1);

            if (_tmpVec3E.lengthSq() > 0) {
                _tmpVec3E.normalize();
                controls.target.addScaledVector(_tmpVec3E, moveSpeed);
                moved = true;
            }
        }

        if (keysPressed['q']) {
            theta -= rotSpeed;
            rotated = true;
        }
        if (keysPressed['e']) {
            theta += rotSpeed;
            rotated = true;
        }
        if (keysPressed['c']) {
            controls.target.set(0, 0, 0);
            moved = true;
        }

        if (moved || rotated) {
            const maxLimitX = sizeX / 2 + 20;
            const maxLimitZ = sizeZ / 2 + 20;
            controls.target.x = Math.max(-maxLimitX, Math.min(maxLimitX, controls.target.x));
            controls.target.z = Math.max(-maxLimitZ, Math.min(maxLimitZ, controls.target.z));

            updateCameraAngles();
        }
    }

    if (cameraMode === 'cinematic') {
        updateCinematicCamera(delta, cinematicTime);
    } else {
        controls.update();
    }

    renderWarriorsInstanced();
    renderer.render(scene, camera);
}

function updateCinematicCamera(delta, time) {
    _tmpVec3C.set(0, 0, 0);
    const center = _tmpVec3C;
    const knights = battleManager.getKnights();
    const goblins = battleManager.getGoblins();
    const totalAlive = knights.length + goblins.length;

    if (totalAlive > 0) {
        knights.forEach(w => center.add(w));
        goblins.forEach(w => center.add(w));
        center.divideScalar(totalAlive);
    }

    _tmpVec3D.set(
        center.x + Math.sin(time * 0.00015) * radius,
        center.y + (radius * 0.5) + Math.cos(time * 0.0001) * 15,
        center.z + Math.cos(time * 0.00015) * radius
    );

    camera.position.lerp(_tmpVec3D, delta * 2.2);
    controls.target.lerp(center, delta * 3.5);
    camera.lookAt(controls.target);
}

const keysPressed = {};
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePause();
    }
    if (e.key === '1' || e.key === '2' || e.key === '3') {
        battleManager.setSimulationSpeed(parseInt(e.key) * 1.0);
        HUD.updateSliderValue('speed', `${battleManager.getSimulationSpeed().toFixed(2)}x`);
    }
    if (['5', '6', '7', '8'].includes(e.key)) {
        if (e.key === '5') numCloudsSetting = 500;
        if (e.key === '6') numCloudsSetting = 600;
        if (e.key === '7') numCloudsSetting = 700;
        if (e.key === '8') numCloudsSetting = 800;
        
        HUD.setCloudsSliderValue(numCloudsSetting);
        HUD.updateSliderValue('clouds', numCloudsSetting);
        
        createClouds();
        createRain();
        setEnvironment(currentEnv);
    }
    if (e.key.toLowerCase() === 'c') {
        controls.target.set(0, 0, 0);
        phi = 0.1;
        radius = Math.max(sizeX, sizeZ) * 0.65;
        updateCameraAngles();
    }
    keysPressed[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

window.addEventListener('blur', () => {
    for (const key in keysPressed) {
        keysPressed[key] = false;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCameraAngles();
});