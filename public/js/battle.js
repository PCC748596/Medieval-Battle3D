// --- SPAWN PROCEDURAL DOS 15 TRONCOS OBSTÁCULOS NO MAPA ---
function spawnBattlefieldObstacles() {
    // Spawn independent of UI checkbox because it was removed

    for (let i = 0; i < CONFIG.BATTLEFIELD_OBSTACLES_COUNT; i++) {
        const logX = (Math.random() - 0.5) * (sizeX - CONFIG.BATTLEFIELD_OBSTACLE_EDGE_MARGIN);
        const logZ = (Math.random() - 0.5) * (sizeZ - CONFIG.BATTLEFIELD_OBSTACLE_EDGE_MARGIN);

        if (Math.abs(logX) < CONFIG.BATTLEFIELD_OBSTACLE_MIN_DIST_X && Math.abs(logZ) < CONFIG.BATTLEFIELD_OBSTACLE_MIN_DIST_Z) {
            i--;
            continue;
        }

        spawnObstacle(logX, logZ);
    }
}

function spawnCatapults() {
    const spawnFactionCatapults = (faction, groups) => {
        const num = Math.min(CONFIG.CATAPULT_MAX, Math.max(1, groups.length));
        const dir = window.armies[faction].dirX;
        
        for (let i = 0; i < num; i++) {
            const groupIndex = Math.floor(i * groups.length / num);
            const group = groups[groupIndex];
            if (!group) continue;
            
            const catX = group.endX;
            const zOff = group.zBase;
            const xOff = isNapoleonicTheme() ? CONFIG.CATAPULT_OFFSET_NAPOLEONIC : CONFIG.CATAPULT_OFFSET_MEDIEVAL;
            
            const cat = new Catapult(faction, catX, zOff);
            battleManager.addCatapult(cat);
            const p1 = new Warrior(faction, 'melee', catX + dir * xOff, zOff - CONFIG.CATAPULT_PUSHER_Z_OFFSET, true, cat);
            const p2 = new Warrior(faction, 'melee', catX + dir * xOff, zOff + CONFIG.CATAPULT_PUSHER_Z_OFFSET, true, cat);
            if (isNapoleonicTheme()) p1.hasTorch = true;
            cat.pushers = [p1, p2];
            const pusherList = window.armies[faction].list;
            p1._armyIndex = pusherList.length;
            p2._armyIndex = pusherList.length + 1;
            pusherList.push(p1, p2);
        }
    };
    
    spawnFactionCatapults('knights', window.knightsGroups || []);
    spawnFactionCatapults('goblins', window.goblinsGroups || []);
}

function createRain() {
    if (rainMesh) {
        scene.remove(rainMesh);
        if (rainMesh.geometry) rainMesh.geometry.dispose();
        if (rainMesh.material) rainMesh.material.dispose();
        rainMesh = null;
    }
    if (numCloudsSetting >= CONFIG.RAIN_CLOUD_THRESHOLD) {
        isRaining = true;
        const rainCount = CONFIG.RAIN_COUNT;
        
        // Efeito de trilha usando uma geometria alongada
        const dropGeo = new THREE.BoxGeometry(CONFIG.RAIN_DROP_SIZE, CONFIG.RAIN_DROP_HEIGHT, CONFIG.RAIN_DROP_SIZE);
        const dropMat = new THREE.MeshBasicMaterial({
            color: 0x99aacc,
            transparent: true,
            opacity: CONFIG.RAIN_OPACITY,
            depthWrite: false
        });

        rainMesh = new THREE.InstancedMesh(dropGeo, dropMat, rainCount);
        rainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        rainPositions = new Float32Array(rainCount * 3);
        rainVelocities = new Float32Array(rainCount);

        const dummy = new THREE.Object3D();

        for (let i = 0; i < rainCount; i++) {
            const x = (Math.random() - 0.5) * CONFIG.RAIN_AREA_SIZE;
            const y = CONFIG.RAIN_START_Y + Math.random() * CONFIG.RAIN_VAR_Y;
            const z = (Math.random() - 0.5) * CONFIG.RAIN_AREA_SIZE;
            const vel = CONFIG.RAIN_MIN_VEL + Math.random() * CONFIG.RAIN_VAR_VEL;

            rainPositions[i * 3] = x;
            rainPositions[i * 3 + 1] = y;
            rainPositions[i * 3 + 2] = z;
            rainVelocities[i] = vel;

            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            rainMesh.setMatrixAt(i, dummy.matrix);
        }
        
        rainMesh.instanceMatrix.needsUpdate = true;
        scene.add(rainMesh);
    } else {
        isRaining = false;
        rainPositions = null;
        rainVelocities = null;
    }
}

const rainDummy = new THREE.Object3D();

const camDir = new THREE.Vector3();

function updateRain(dt) {
    if (!isRaining || !rainMesh || !rainPositions) return;
    
    // 1. Reduzir quantidade automaticamente conforme FPS
    let targetCount = CONFIG.RAIN_COUNT;
    const currentFPS = window.currentFPS || 60;
    
    if (currentFPS < 30) {
        targetCount = Math.floor(CONFIG.RAIN_COUNT * 0.25);
    } else if (currentFPS < 45) {
        targetCount = Math.floor(CONFIG.RAIN_COUNT * 0.5);
    } else if (currentFPS < 55) {
        targetCount = Math.floor(CONFIG.RAIN_COUNT * 0.75);
    }
    
    rainMesh.count = targetCount;
    let needsUpdate = false;
    
    const camX = camera.position.x;
    const camZ = camera.position.z;
    const maxDist = 300; 
    const maxDistSq = maxDist * maxDist;
    const simSpeed = battleManager.getSimulationSpeed();

    camera.getWorldDirection(camDir);
    
    for (let i = 0; i < targetCount; i++) {
        let px = rainPositions[i * 3];
        let pz = rainPositions[i * 3 + 2];
        
        const dx = px - camX;
        const dz = pz - camZ;
        const distSq = dx * dx + dz * dz;

        // 2. Utilizar distância da câmera e atualizar apenas gotas próximas
        if (distSq > maxDistSq) {
            // Reaproveita gota reposicionando-a perto da câmera
            rainPositions[i * 3] = camX + camDir.x * maxDist * 0.5 + (fastRandom() - 0.5) * maxDist * 1.2;
            rainPositions[i * 3 + 2] = camZ + camDir.z * maxDist * 0.5 + (fastRandom() - 0.5) * maxDist * 1.2;
            rainPositions[i * 3 + 1] = CONFIG.RAIN_START_Y + fastRandom() * CONFIG.RAIN_VAR_Y;
            continue; // Pula matrix update neste frame (economiza CPU)
        }

        // Físicas da chuva
        let py = rainPositions[i * 3 + 1];
        py -= rainVelocities[i] * dt * simSpeed;
        
        if (py < 0) {
            py = CONFIG.RAIN_START_Y + fastRandom() * CONFIG.RAIN_VAR_Y;
            rainPositions[i * 3] = camX + (fastRandom() - 0.5) * maxDist * 1.2;
            rainPositions[i * 3 + 2] = camZ + (fastRandom() - 0.5) * maxDist * 1.2;
        }
        rainPositions[i * 3 + 1] = py;

        // 3. Evitar update de gotas invisíveis (atrás da câmera)
        const dot = dx * camDir.x + dz * camDir.z;
        if (dot < -50) {
            continue; // Economiza o updateMatrix() pesado
        }
        
        rainDummy.position.set(rainPositions[i * 3], py, rainPositions[i * 3 + 2]);
        rainDummy.updateMatrix();
        rainMesh.setMatrixAt(i, rainDummy.matrix);
        needsUpdate = true;
    }
    
    if (needsUpdate) {
        rainMesh.instanceMatrix.needsUpdate = true;
    }
}

function updateLightning(dt) {
    if (flashCountdown > 0) {
        flashCountdown -= dt;
        if (flashCountdown <= 0) {
            setEnvironment(currentEnv); // Restaura totalmente a iluminação base + clima
        } else {
            // Efeito de flicker do raio
            if (Math.random() > 0.3) {
                dirLight.intensity = CONFIG.LIGHTNING_FLASH_DIR_LIGHT;
                ambientLight.intensity = CONFIG.LIGHTNING_FLASH_AMB_LIGHT;
            } else {
                dirLight.intensity = CONFIG.LIGHTNING_DARK_DIR_LIGHT;
                ambientLight.intensity = CONFIG.LIGHTNING_DARK_AMB_LIGHT;
            }
        }
    } else {
        if (numCloudsSetting >= CONFIG.RAIN_CLOUD_THRESHOLD) {
            lightningTimer += dt * battleManager.getSimulationSpeed();
            if (nextLightningTime === 0) {
                nextLightningTime = numCloudsSetting >= CONFIG.LIGHTNING_STORM_THRESHOLD ? CONFIG.LIGHTNING_MIN_TIME_STORM + Math.random() * CONFIG.LIGHTNING_VAR_TIME_STORM : CONFIG.LIGHTNING_MIN_TIME_NORMAL + Math.random() * CONFIG.LIGHTNING_VAR_TIME_NORMAL;
            }
            if (lightningTimer >= nextLightningTime) {
                flashCountdown = CONFIG.LIGHTNING_MIN_DUR + Math.random() * CONFIG.LIGHTNING_VAR_DUR; // Duração do flash entre 0.15s e 0.35s
                lightningTimer = 0;
                nextLightningTime = numCloudsSetting >= CONFIG.LIGHTNING_STORM_THRESHOLD ? CONFIG.LIGHTNING_MIN_TIME_STORM + Math.random() * CONFIG.LIGHTNING_VAR_TIME_STORM : CONFIG.LIGHTNING_MIN_TIME_NORMAL + Math.random() * CONFIG.LIGHTNING_VAR_TIME_NORMAL;
            }
        } else {
            lightningTimer = 0;
            nextLightningTime = 0;
        }
    }
}

function createClouds() {
    if (cloudInstancedMesh) {
        scene.remove(cloudInstancedMesh);
        if (cloudInstancedMesh.geometry) cloudInstancedMesh.geometry.dispose();
        if (cloudInstancedMesh.material) cloudInstancedMesh.material.dispose();
    }
    clouds.length = 0;

    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const cloudGeo = new THREE.BoxGeometry(1, 1, 1);

    const numClouds = typeof numCloudsSetting !== 'undefined' ? numCloudsSetting : 200;
    let totalBlocks = 0;

    // Define a direção global do vento para esta batalha (entre 5 e 10 "knots")
    const windSpeed = CONFIG.CLOUD_WIND_MIN + Math.random() * CONFIG.CLOUD_WIND_VAR;
    const windAngle = Math.random() * Math.PI * 2;
    const windSpeedX = Math.cos(windAngle) * windSpeed;
    const windSpeedZ = Math.sin(windAngle) * windSpeed;

    // Preparar dados lógicos primeiro
    const tempClouds = [];
    for (let i = 0; i < numClouds; i++) {
        const numBlocks = CONFIG.CLOUD_MIN_BLOCKS + Math.floor(Math.random() * CONFIG.CLOUD_VAR_BLOCKS);
        const blocks = [];
        for (let j = 0; j < numBlocks; j++) {
            blocks.push({
                scaleX: CONFIG.CLOUD_MIN_SCALE_X + Math.random() * CONFIG.CLOUD_VAR_SCALE_X, // Nuvens maiores
                scaleY: CONFIG.CLOUD_MIN_SCALE_Y + Math.random() * CONFIG.CLOUD_VAR_SCALE_Y,
                scaleZ: CONFIG.CLOUD_MIN_SCALE_Z + Math.random() * CONFIG.CLOUD_VAR_SCALE_Z,
                offsetX: (Math.random() - 0.5) * CONFIG.CLOUD_OFFSET_XZ,
                offsetY: (Math.random() - 0.5) * CONFIG.CLOUD_OFFSET_Y,
                offsetZ: (Math.random() - 0.5) * CONFIG.CLOUD_OFFSET_XZ
            });
            totalBlocks++;
        }
        tempClouds.push({
            x: (Math.random() - 0.5) * CONFIG.CLOUD_AREA_SIZE,
            y: CONFIG.CLOUD_BASE_Y + Math.random() * CONFIG.CLOUD_VAR_HEIGHT, // Mais baixas (aumentado em 100)
            z: (Math.random() - 0.5) * CONFIG.CLOUD_AREA_SIZE,
            speedX: windSpeedX,
            speedZ: windSpeedZ,
            blocks: blocks,
            blockStartIndex: totalBlocks - numBlocks
        });
    }

    cloudInstancedMesh = new THREE.InstancedMesh(cloudGeo, cloudMat, totalBlocks);
    cloudInstancedMesh.castShadow = true; // Sombra projetada
    scene.add(cloudInstancedMesh);

    clouds.push(...tempClouds);
    updateCloudMatrices();
}

function updateCloudMatrices() {
    if (!cloudInstancedMesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < clouds.length; i++) {
        const cloud = clouds[i];
        for (let j = 0; j < cloud.blocks.length; j++) {
            const b = cloud.blocks[j];
            dummy.position.set(cloud.x + b.offsetX, cloud.y + b.offsetY, cloud.z + b.offsetZ);
            dummy.scale.set(b.scaleX, b.scaleY, b.scaleZ);
            dummy.updateMatrix();
            cloudInstancedMesh.setMatrixAt(cloud.blockStartIndex + j, dummy.matrix);
        }
    }
    cloudInstancedMesh.instanceMatrix.needsUpdate = true;
}

function clearUnits() {
    battleManager.getKnights().forEach(w => {
        
        if (w.uniqueBodyMat) w.uniqueBodyMat.dispose();
    });
    battleManager.getGoblins().forEach(w => {
        
        if (w.uniqueBodyMat) w.uniqueBodyMat.dispose();
    });
    battleManager.getDeadWarriors().forEach(w => {
        
        if (w.uniqueBodyMat) w.uniqueBodyMat.dispose();
    });
    battleManager.setKnights([]);
    battleManager.setGoblins([]);
    battleManager.setDeadWarriors([]);
    battleManager.setKills(0);
    totalDeadKnights = 0;
    totalDeadGoblins = 0;
    
    // Clear AI Commander data
    if (window.AICommanderSystem) {
        window.AICommanderSystem.knightGeneral.brigades = [];
        window.AICommanderSystem.goblinGeneral.brigades = [];
    }

    battleManager.setBattleEnded(false);
    HUD.hideBattleEndModal();
    HUD.updateKills(0);
}

function clearProjectiles() {
    ArrowPool.releaseAll(battleManager.getArrows());
    BoulderPool.releaseAll(boulders);
}

function clearParticles() {
    ParticlePool.releaseAll(battleManager.getParticles());
}

function clearObstacles() {
    fallenLogs.forEach(log => {
        scene.remove(log.mesh);
        log.mesh.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
        });
    });
    fallenLogs.length = 0;
    battleManager.setCatapults([]);
}

function clearWeather() {
    // Cleanup is handled internally by createClouds and createRain, but we expose the function for the pattern
}

function spawnEnvironment() {
    clearArena();
    buildArena();
    spawnTrees();
    createClouds();
    createRain();
    rebuildSpatialGrid();
    spawnBattlefieldObstacles();
}

function spawnArmies() {
    const sizeInput = HUD.getUnitsSliderValue() || 500;
    spawnUnits('knights', sizeInput);
    spawnUnits('goblins', sizeInput);
}

function resetCamera() {
    theta = CONFIG.CAMERA_THETA;
    phi = CONFIG.CAMERA_PHI;
    radius = sizeX * CONFIG.CAMERA_RADIUS_RATIO;
    controls.target.set(0, 0, 0);
    updateCameraAngles();
}

function resetBattle() {
    clearWeather();
    spawnEnvironment();
    
    clearUnits();
    clearProjectiles();
    clearParticles();
    clearObstacles();
    
    // Reset stats
    window.blockStats = { waiting: 0, flanking: 0, avoidedCalcs: 0 };
    
    spawnArmies();
    spawnCatapults();
    
    resetCamera();
    playWarCrySound();
    
    battleManager.setPause(true);
    HUD.updatePause(true);
    if (soundEnabled) {
        stopDrumLoop();
        stopContinuousCrowdRoar();
    }
}
window.resetBattle = resetBattle;

function setupBattleListeners() {
    HUD.setupListeners({
        onUnitsChange: (val) => {
            HUD.updateSliderValue('units', val);
        },
        onFlankChange: (val) => {
            HUD.updateSliderValue('flank-ratio', `${val}%`);
            flankRatio = parseInt(val) / 100;
        },
        onCloudsChange: (val) => {
            HUD.updateSliderValue('clouds', val);
            numCloudsSetting = parseInt(val);
            createClouds();
            createRain();
            setEnvironment(currentEnv);
        },
        onArcherChange: (val) => {
            HUD.updateSliderValue('archer-ratio', `${val}%`);
            archerRatio = parseInt(val) / 100;
        },
        onArenaInput: (val) => {
            HUD.updateSliderValue('arena', `${Math.round(val * CONFIG.ARENA_ASPECT_RATIO)}x${val}`);
        },
        onArenaChange: (val) => {
            changeBattlefieldSize(parseInt(val));
        },
        onSpeedChange: (val) => {
            battleManager.setSimulationSpeed(parseFloat(val));
            HUD.updateSliderValue('speed', `${battleManager.getSimulationSpeed().toFixed(2)}x`);
        }
    });
}
window.setupBattleListeners = setupBattleListeners;

function changeBattlefieldSize(val) {
    sizeX = Math.round(val * CONFIG.ARENA_ASPECT_RATIO);
    sizeZ = val;

    // Reconstrói o cache de relevo do terreno com o novo tamanho de battlefield
    if (typeof initTerrainHeightCache === 'function') {
        initTerrainHeightCache();
    }

    // Ajusta a densidade do fog de acordo com o tamanho para manter a visibilidade proporcional do campo todo
    if (scene.fog) {
        scene.fog.density = CONFIG.FOG_DENSITY_MULTIPLIER / sizeX;
    }

    resetBattle();
}
window.changeBattlefieldSize = changeBattlefieldSize;

window.setTheme = function (theme) {
    currentTheme = theme;

    // Reset templates to force regeneration
    templateMeshes.knights.melee = null;
    templateMeshes.knights.archer = null;
    templateMeshes.goblins.melee = null;
    templateMeshes.goblins.archer = null;

    // Clear animated geometries so they are re-cached with the new theme templates
    window.animatedGeometries = {
        knights: {
            melee: { idle: null, walk: [], attack: [] },
            archer: { idle: null, walk: [], attack: [] }
        },
        goblins: {
            melee: { idle: null, walk: [], attack: [] },
            archer: { idle: null, walk: [], attack: [] }
        }
    };

    // Regenerate shield textures and update materials
    if (textures.knights.shield) textures.knights.shield.dispose();
    if (textures.goblins.shield) textures.goblins.shield.dispose();
    textures.knights.shield = generateShieldTexture('knights');
    textures.goblins.shield = generateShieldTexture('goblins');

    shieldMaterials.knights.map = textures.knights.shield;
    shieldMaterials.goblins.map = textures.goblins.shield;
    shieldMaterials.knights.needsUpdate = true;
    shieldMaterials.goblins.needsUpdate = true;

    // Update labels in HUD
    if (theme === 'napoleonic' || theme === 'napoleonic_3d') {
        HUD.updateTheme(theme, "Franceses", "Britânicos");
    } else {
        HUD.updateTheme(theme, "Cavaleiros", "Goblins");
    }

    resetBattle();
};

function toggleLOD(enabled) {
    lodEnabled = enabled;
    if (!lodEnabled) {
        const showAll = (list) => {
            list.forEach(w => {
                w.visible = true;
                if (w.armL) w.armL.visible = true;
                if (w.armR) w.armR.visible = true;
                if (w.legL) w.legL.visible = true;
                if (w.legR) w.legR.visible = true;
                w.lodLevel = 0;
            });
        };
        showAll(battleManager.getKnights());
        showAll(battleManager.getGoblins());
        showAll(battleManager.getDeadWarriors());
    }
}
window.toggleLOD = toggleLOD;

// --- 9. GERADOR E CONTROLO DE BATALHA ---

window.armies = {
    knights: {
        dirX: -1,
        rotationY: -Math.PI / 2,
        colorHex: 0xffbb00,
        lodMat: () => typeof lodBlueMat !== 'undefined' ? lodBlueMat : null,
        headMat: () => typeof skinFleshMat !== 'undefined' ? skinFleshMat : null,
        bladeMat: () => typeof steelMaterial !== 'undefined' ? steelMaterial : null,
        isFrench: true,
        baseSpeedMelee: 0.10,
        baseSpeedArcher: 0.07,
        attackStrength: 70, // Força média de ataque dos combatentes (slider)
        defenseStrength: 70, // Força média de defesa dos combatentes (slider)
        catapultDir: 1,
        catapultRotationY: -Math.PI / 2,
        get enemies() { return battleManager.getGoblins(); },
        get list() { return battleManager.getKnights(); },
        get groups() { return window.knightsGroups; },
        set groups(val) { window.knightsGroups = val; },
        addDeadCount: () => { totalDeadKnights++; }
    },
    goblins: {
        dirX: 1,
        rotationY: Math.PI / 2,
        colorHex: 0x00ffaa,
        lodMat: () => typeof lodGreenMat !== 'undefined' ? lodGreenMat : null,
        headMat: () => typeof skinGreenMat !== 'undefined' ? skinGreenMat : null,
        bladeMat: () => typeof woodMaterial !== 'undefined' ? woodMaterial : null,
        isFrench: false,
        baseSpeedMelee: 0.10,
        baseSpeedArcher: 0.07,
        attackStrength: 70, // Força média de ataque dos combatentes (slider)
        defenseStrength: 70, // Força média de defesa dos combatentes (slider)
        catapultDir: -1,
        catapultRotationY: Math.PI / 2,
        get enemies() { return battleManager.getKnights(); },
        get list() { return battleManager.getGoblins(); },
        get groups() { return window.goblinsGroups; },
        set groups(val) { window.goblinsGroups = val; },
        addDeadCount: () => { totalDeadGoblins++; }
    }
};

function togglePanel() {
    panelVisible = !panelVisible;
    HUD.updateSettingsVisibility(panelVisible);
}
window.togglePanel = togglePanel;

function togglePause() {
    battleManager.setPause(!battleManager.isPaused());
    HUD.updatePause(battleManager.isPaused());

    if (battleManager.isPaused()) {
        if (soundEnabled) {
            stopDrumLoop();
            stopContinuousCrowdRoar();
        }
    } else {
        if (soundEnabled) {
            startDrumLoop();
            startContinuousCrowdRoar();
        }
    }
}
window.togglePause = togglePause;

function setCameraMode(mode) {
    cameraMode = mode;
    HUD.updateCameraBtn(mode);

    if (mode === 'orbit') {
        controls.enabled = true;
    } else {
        controls.enabled = false;
    }
}
window.setCameraMode = setCameraMode;
function calculateArmyComposition(quantity, archerRatio, isNapoleonicTheme) {
    let numArchers = Math.round(quantity * archerRatio);
    if (isNapoleonicTheme()) {
        numArchers = 0;
    }
    const numMelee = quantity - numArchers;
    return { numArchers, numMelee };
}

function createGroups(numMelee, sizeZ, maxZRatio, baseGroupSpacing) {
    const G = Math.max(1, Math.ceil(numMelee / 100));
    const maxZ = sizeZ * maxZRatio;
    const groupSpacingZ = (G > 1) ? Math.min(baseGroupSpacing, maxZ / (G - 1)) : 0;
    return { G, groupSpacingZ };
}

function spawnFormation(faction, role, count, startX, dir, startXOffset, zBase, colsPerBlock, spacingX, spacingZ, aiBrigade) {
    let aiFormation = null;
    if (aiBrigade) {
        aiFormation = aiBrigade.createFormation();
        aiFormation.type = role === 'archer' ? 'line' : 'block';
    }

    let depth = 0;
    const formationStartX = startX + dir * startXOffset;
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / colsPerBlock);
        const col = i % colsPerBlock;
        depth = Math.max(depth, row + 1);
        
        const x = formationStartX + dir * (row * spacingX);
        const z = zBase + (col - (colsPerBlock - 1) / 2) * spacingZ;
        
        const w = new Warrior(faction, role, x, z);
        if (aiFormation) {
            aiFormation.addSoldier(w);
        }
        const armyList = window.armies[faction].list;
        w._armyIndex = armyList.length;
        armyList.push(w);
    }
    return depth;
}

function spawnMelee(faction, count, startX, dir, zBase, colsPerBlock, spacingX, spacingZ, aiBrigade) {
    return spawnFormation(faction, 'melee', count, startX, dir, 0, zBase, colsPerBlock, spacingX, spacingZ, aiBrigade);
}

function spawnArchers(faction, count, startX, dir, zBase, archerStartXOffset, colsPerBlock, spacingX, spacingZ, aiBrigade) {
    return spawnFormation(faction, 'archer', count, startX, dir, archerStartXOffset, zBase, colsPerBlock, spacingX, spacingZ, aiBrigade);
}

function registerGroups(faction, groups) {
    window.armies[faction].groups = groups;
}

function updateArmyCounters() {
    HUD.updateArmyCounts(battleManager.getKnights().length, battleManager.getGoblins().length);
}

// Ajusta a força média (ataque/defesa) de um exército via sliders do HUD.
// Aplica-se aos soldados criados a partir da mudança (spawn/reforços/reset).
window.setArmyStrength = function (faction, kind, value) {
    const v = Math.max(20, Math.min(100, parseInt(value) || CONFIG.STRENGTH_BASELINE));
    if (!window.armies[faction]) return;
    if (kind === 'attack') window.armies[faction].attackStrength = v;
    else window.armies[faction].defenseStrength = v;
    const label = document.getElementById(`${faction}-${kind}-strength-val`);
    if (label) label.innerText = v;
    updateArmyCounters();
};

function spawnUnits(faction, quantity) {
    const { numArchers, numMelee } = calculateArmyComposition(quantity, archerRatio, isNapoleonicTheme);

    const colsPerBlock = CONFIG.UNITS_COLS_PER_BLOCK;
    const spacingX = CONFIG.UNITS_SPACING_X;
    const spacingZ = CONFIG.UNITS_SPACING_Z;

    const dir = window.armies[faction].dirX;
    const startX = dir * (sizeX * CONFIG.BATTLEFIELD_START_X_RATIO);

    const { G, groupSpacingZ } = createGroups(numMelee, sizeZ, CONFIG.BATTLEFIELD_MAX_Z_RATIO, CONFIG.UNITS_BASE_GROUP_SPACING);

    const groups = [];

    for (let g = 0; g < G; g++) {
        const countMelee = Math.floor(numMelee / G) + (g < numMelee % G ? 1 : 0);
        const countArchers = Math.floor(numArchers / G) + (g < numArchers % G ? 1 : 0);
        const zBase = (g - (G - 1) / 2) * groupSpacingZ;

        let aiBrigade = null;
        if (window.AICommanderSystem) {
            const general = window.AICommanderSystem[faction === 'knights' ? 'knightGeneral' : 'goblinGeneral'];
            aiBrigade = general.createBrigade(`${faction}-brig-${g}`, 'MIXED');
        }

        const meleeDepth = spawnMelee(faction, countMelee, startX, dir, zBase, colsPerBlock, spacingX, spacingZ, aiBrigade);

        const archerStartXOffset = meleeDepth * spacingX + CONFIG.UNITS_ARCHER_GAP;
        const archerDepth = spawnArchers(faction, countArchers, startX, dir, zBase, archerStartXOffset, colsPerBlock, spacingX, spacingZ, aiBrigade);

        const groupEndXOffset = archerStartXOffset + archerDepth * spacingX + CONFIG.UNITS_CATAPULT_GAP;
        groups.push({
            zBase: zBase,
            endX: startX + dir * groupEndXOffset
        });
    }

    registerGroups(faction, groups);
    updateArmyCounters();
}
window.spawnUnits = spawnUnits;

window.spawnReinforcements = function (faction, quantity) {
    spawnUnits(faction, quantity);
};
