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
        // Flags de sujeira por IM: evita needsUpdate (re-upload do buffer inteiro)
        // em frames onde nenhuma matriz/cor foi efetivamente alterada
        im.userData.matrixDirty = false;
        im.userData.colorDirty = false;
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
            const im = this.meshes[i];
            if (im.count > 0) {
                if (im.userData.matrixDirty) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('needs_update');
                    im.instanceMatrix.needsUpdate = true;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('needs_update');
                }
                if (im.userData.colorDirty && im.instanceColor) {
                    im.instanceColor.needsUpdate = true;
                }
            }
            im.userData.matrixDirty = false;
            im.userData.colorDirty = false;
        }
    }
};

const _tmpColorIM = new THREE.Color();
const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();
const _sphere = new THREE.Sphere();

function renderList(list) {
    if (!window.RenderOptimizationStats) {
        window.RenderOptimizationStats = {
            setMatrixAtSaved: 0,
            setMatrixAtTotal: 0,
            colorUpdatesSaved: 0,
            colorUpdatesTotal: 0,
            visibilityChecksSaved: 0,
            visibilityChecksTotal: 0
        };
    }

    const len = list.length;
    for (let i = 0; i < len; i++) {
        const w = list[i];
        const isWarrior = (w.isWarrior === true);
        
        let mesh = isWarrior ? w.dummy : w.mesh;
        let pos = isWarrior ? w : w.mesh.position;
        
        if (window.PerformanceProfiler) window.PerformanceProfiler.start('visibilidade');
        
        if (window.RenderOptimizationStats) window.RenderOptimizationStats.visibilityChecksTotal++;
        let visible;
        if (isWarrior) {
            w.updateDirtyFlags();
            if (w.visibilityDirty || w._cachedVisible === undefined) {
                w._cachedVisible = w.visible;
                w.visibilityDirty = false;
            } else {
                if (window.RenderOptimizationStats) window.RenderOptimizationStats.visibilityChecksSaved++;
            }
            visible = w._cachedVisible;
        } else {
            visible = w.mesh.visible;
        }
        
        if (window.PerformanceProfiler) window.PerformanceProfiler.end('visibilidade');

        if (!visible) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('lod_render');
            const lodLvl = w.lodLevel;
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('lod_render');
            if (lodLvl !== undefined && lodLvl > 1) continue;
            if (lodLvl === undefined) continue;
        }

        // CPU Frustum Culling
        _sphere.set(pos, (w.radius || 0.8) + 2.5);
        if (!_frustum.intersectsSphere(_sphere)) {
            continue;
        }

        if (isWarrior) {
            if (!mesh) continue;
            const useMergedOptimization = isWarrior && currentTheme !== 'napoleonic_3d' && w.lodLevel === 0 && !w.isPusher;
            
            if (w.matrixDirty) {
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                mesh.position.set(w.x, w.y, w.z);
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');

                if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                mesh.rotation.set(w.rotX || 0, w.rotY || 0, w.rotZ || 0);
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');

                mesh.scale.set(w.scale || 1, w.scale || 1, w.scale || 1);

                if (!useMergedOptimization) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('animacoes_visuais');
                    w.applyPoseToDummy(mesh);
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('animacoes_visuais');

                    // Não-merged: submeshes renderizam via child.matrixWorld — atualização completa
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('update_matrix');
                    mesh.updateMatrixWorld(true);
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('update_matrix');
                } else {
                    // Merged: o dummy nunca entra na cena (sem parent) e as poses vêm pré-assadas
                    // na geometria animada — as matrizes dos filhos nunca são lidas.
                    // matrixWorld == matriz local, sem tocar na subárvore.
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('update_matrix');
                    mesh.updateMatrix();
                    mesh.matrixWorld.copy(mesh.matrix);
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('update_matrix');
                }

                w.matrixDirty = false;
                w.positionDirty = false;
                w.rotationDirty = false;
                w.lodDirty = false;
            }
        } else {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('update_matrix');
            mesh.updateMatrixWorld(true);
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('update_matrix');
        }
        
        const isFlashed = w.flashTimer > 0;
        const useMergedOptimization = isWarrior && currentTheme !== 'napoleonic_3d' && w.lodLevel === 0 && !w.isPusher;

        if (useMergedOptimization) {
            let geom = null;
            const faction = w.faction;
            const role = w.role;
            const anims = window.animatedGeometries && window.animatedGeometries[faction] && window.animatedGeometries[faction][role];

            if (anims) {
                if (w.isDead) {
                    geom = anims.idle;
                } else if (w.isAttacking) {
                    const frame = Math.floor(w.attackAnimProgress * 6) % 6;
                    geom = anims.attack[frame] || anims.idle;
                } else if (w.isTryingToMove || (w.lastVelocity && w.lastVelocity.lengthSq() > 0.0001)) {
                    const frame = Math.floor(((w.animTime || 0) % (2 * Math.PI)) / (2 * Math.PI) * 8) % 8;
                    geom = anims.walk[frame] || anims.idle;
                } else {
                    geom = anims.idle;
                }
            }

            if (geom) {
                const mat = window.sharedMergedMaterial;
                const im = imAllocator.getIM(geom, mat);
                const idx = im.count;
                if (idx < im.instanceMatrix.count) {
                    if (window.RenderOptimizationStats) window.RenderOptimizationStats.setMatrixAtTotal++;
                    
                    let matrixMatch = false;
                    const array = im.instanceMatrix.array;
                    const offset = idx * 16;
                    const elements = w.dummy.matrixWorld.elements;
                    
                    if (!w.matrixDirty) {
                        matrixMatch = true;
                        for (let j = 0; j < 16; j++) {
                            if (array[offset + j] !== elements[j]) {
                                matrixMatch = false;
                                break;
                            }
                        }
                    }
                    
                    if (matrixMatch) {
                        if (window.RenderOptimizationStats) window.RenderOptimizationStats.setMatrixAtSaved++;
                    } else {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('set_matrix_at');
                        im.setMatrixAt(idx, w.dummy.matrixWorld);
                        im.userData.matrixDirty = true;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('set_matrix_at');
                    }

                    if (!im.instanceColor) {
                        const colors = new Float32Array(im.instanceMatrix.count * 3);
                        colors.fill(1.0);
                        im.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
                        im.instanceColor.setUsage(THREE.DynamicDrawUsage);
                    }

                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('cores');
                    if (isFlashed) {
                        _tmpColorIM.setHex(0xffaaaa);
                    } else if (w.baseColor) {
                        _tmpColorIM.copy(w.baseColor);
                    } else {
                        _tmpColorIM.setHex(0xffffff);
                    }
                    
                    let colorMatch = false;
                    const colorOffset = idx * 3;
                    const r = im.instanceColor.array[colorOffset];
                    const g = im.instanceColor.array[colorOffset + 1];
                    const b = im.instanceColor.array[colorOffset + 2];
                    if (r === _tmpColorIM.r && g === _tmpColorIM.g && b === _tmpColorIM.b) {
                        colorMatch = true;
                    }
                    
                    if (window.RenderOptimizationStats) window.RenderOptimizationStats.colorUpdatesTotal++;
                    if (colorMatch) {
                        if (window.RenderOptimizationStats) window.RenderOptimizationStats.colorUpdatesSaved++;
                    } else {
                        im.instanceColor.setXYZ(idx, _tmpColorIM.r, _tmpColorIM.g, _tmpColorIM.b);
                        im.userData.colorDirty = true;
                    }
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('cores');

                    im.count++;
                }
                continue;
            }
        }

        let subMeshes = isWarrior ? mesh.subMeshes : w.subMeshes;
        if (!subMeshes) {
            subMeshes = [];
            mesh.traverse(child => {
                if (child.isMesh) subMeshes.push(child);
            });
            if (isWarrior) mesh.subMeshes = subMeshes;
            else w.subMeshes = subMeshes;
        }

        let subMeshesToRender;
        if (isWarrior) {
            if (!w.visibleSubMeshes || w.lodDirty || w.visibilityDirty) {
                if (!w.visibleSubMeshes) {
                    w.visibleSubMeshes = [];
                } else {
                    w.visibleSubMeshes.length = 0; // Reutiliza o array cacheado, sem alocação por frame
                }
                const subLen = subMeshes.length;
                for (let m = 0; m < subLen; m++) {
                    const child = subMeshes[m];
                    if (child.visible) {
                        w.visibleSubMeshes.push(child);
                    }
                    if (window.RenderOptimizationStats) window.RenderOptimizationStats.visibilityChecksTotal++;
                }
            } else {
                if (window.RenderOptimizationStats) {
                    window.RenderOptimizationStats.visibilityChecksTotal += subMeshes.length;
                    window.RenderOptimizationStats.visibilityChecksSaved += subMeshes.length;
                }
            }
            subMeshesToRender = w.visibleSubMeshes;
        } else {
            subMeshesToRender = [];
            const subLen = subMeshes.length;
            for (let m = 0; m < subLen; m++) {
                if (subMeshes[m].visible) {
                    subMeshesToRender.push(subMeshes[m]);
                }
            }
        }

        const subLen = subMeshesToRender.length;
        for (let m = 0; m < subLen; m++) {
            const child = subMeshesToRender[m];
            
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('geometrias');
            const geom = child.geometry;
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('geometrias');
            
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('materiais');
            const mat = child.material;
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('materiais');

            if (window.PerformanceProfiler) window.PerformanceProfiler.start('sombras');
            const cast = child.castShadow;
            const rec = child.receiveShadow;
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('sombras');

            let partKey = null;
            if (child.name === 'armL' || child.name === 'armR') {
                partKey = 'bracos';
            } else if (child.name === 'legL' || child.name === 'legR') {
                partKey = 'pernas';
            } else if (child.name === 'shield') {
                partKey = 'escudos';
            } else if (child.name === 'swordGroup' || child.name === 'blade' || child.name === 'guard') {
                partKey = 'espadas';
            } else if (child.name === 'torchGroup' || child.name === 'torch' || (child.name && child.name.includes('torch'))) {
                partKey = 'tochas';
            }
            
            if (partKey && window.PerformanceProfiler) window.PerformanceProfiler.start(partKey);
            const im = imAllocator.getIM(geom, mat);
            const idx = im.count;
            if (idx >= im.instanceMatrix.count) {
                if (partKey && window.PerformanceProfiler) window.PerformanceProfiler.end(partKey);
                continue;
            }

            if (window.RenderOptimizationStats) window.RenderOptimizationStats.setMatrixAtTotal++;
            
            let matrixMatch = false;
            const array = im.instanceMatrix.array;
            const offset = idx * 16;
            const elements = child.matrixWorld.elements;
            
            // Check if matrix is already correct in the buffer at this index
            if (isWarrior && !w.matrixDirty) {
                matrixMatch = true;
                for (let j = 0; j < 16; j++) {
                    if (array[offset + j] !== elements[j]) {
                        matrixMatch = false;
                        break;
                    }
                }
            }
            
            if (matrixMatch) {
                if (window.RenderOptimizationStats) window.RenderOptimizationStats.setMatrixAtSaved++;
            } else {
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('set_matrix_at');
                im.setMatrixAt(idx, child.matrixWorld);
                im.userData.matrixDirty = true;
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('set_matrix_at');
            }

            if (!im.instanceColor) {
                const colors = new Float32Array(im.instanceMatrix.count * 3);
                colors.fill(1.0);
                im.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
                im.instanceColor.setUsage(THREE.DynamicDrawUsage);
            }

            if (window.PerformanceProfiler) window.PerformanceProfiler.start('cores');
            if (isFlashed && (child.name === 'highDetail' || child.name === 'head' || child.name === 'torso' || child.name === 'armL' || child.name === 'armR' || child.name === 'legL' || child.name === 'legR')) {
                _tmpColorIM.setHex(0xffaaaa);
            } else if (w.baseColor) {
                _tmpColorIM.copy(w.baseColor);
            } else {
                _tmpColorIM.setHex(0xffffff);
            }
            
            let colorMatch = false;
            const colorOffset = idx * 3;
            const r = im.instanceColor.array[colorOffset];
            const g = im.instanceColor.array[colorOffset + 1];
            const b = im.instanceColor.array[colorOffset + 2];
            if (r === _tmpColorIM.r && g === _tmpColorIM.g && b === _tmpColorIM.b) {
                colorMatch = true;
            }
            
            if (window.RenderOptimizationStats) window.RenderOptimizationStats.colorUpdatesTotal++;
            if (colorMatch) {
                if (window.RenderOptimizationStats) window.RenderOptimizationStats.colorUpdatesSaved++;
            } else {
                im.setColorAt(idx, _tmpColorIM);
                im.userData.colorDirty = true;
            }
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('cores');
            
            im.count++;
            if (partKey && window.PerformanceProfiler) window.PerformanceProfiler.end(partKey);
        }
        
        if (isWarrior) {
            w.colorDirty = false;
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
            im.userData.matrixDirty = true;

            if (!im.instanceColor) {
                const colors = new Float32Array(im.instanceMatrix.count * 3);
                colors.fill(1.0);
                im.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
                im.instanceColor.setUsage(THREE.DynamicDrawUsage);
            }

            if (isFlashed && (child.name === 'highDetail' || child.name === 'head' || child.name === 'torso' || child.name === 'armL' || child.name === 'armR' || child.name === 'legL' || child.name === 'legR')) {
                _tmpColorIM.setHex(0xffaaaa);
            } else if (w.baseColor) {
                _tmpColorIM.copy(w.baseColor);
            } else {
                _tmpColorIM.setHex(0xffffff);
            }
            im.setColorAt(idx, _tmpColorIM);
            im.userData.colorDirty = true;
            im.count++;
        }
    }
}

function renderWarriorsInstanced() {
    // Update Camera Frustum once per frame
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    if (window.PerformanceProfiler) window.PerformanceProfiler.start('render_unidades');
    imAllocator.resetCounts();

    renderList(battleManager.getKnights());
    renderList(battleManager.getGoblins());
    renderList(battleManager.getDeadWarriors());
    if (window.PerformanceProfiler) {
        window.PerformanceProfiler.end('render_unidades');
        window.PerformanceProfiler.start('flechas');
    }
    renderList(battleManager.getArrows());
    if (window.PerformanceProfiler) {
        window.PerformanceProfiler.end('flechas');
        window.PerformanceProfiler.start('particulas');
    }
    renderParticles();
    if (window.PerformanceProfiler) {
        window.PerformanceProfiler.end('particulas');
        window.PerformanceProfiler.start('catapultas');
    }
    renderList(battleManager.getCatapults());

    if (window.PerformanceProfiler) {
        window.PerformanceProfiler.end('catapultas');
        window.PerformanceProfiler.start('matrizes_instancedmesh');
    }
    imAllocator.updateMatrices();
    if (window.PerformanceProfiler) window.PerformanceProfiler.end('matrizes_instancedmesh');
}

let selectionCirclesIM = null;
let selectionCatapultCirclesIM = null;
const _dummyCircle = new THREE.Object3D();

function renderSelectionMarker() {
    if (!selectionCirclesIM) {
        // Anel de seleção para soldados (raio 0.8 a 1.6)
        const geo = new THREE.RingGeometry(0.8, 1.6, 16);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.7, 
            side: THREE.DoubleSide,
            depthWrite: false
        });
        selectionCirclesIM = new THREE.InstancedMesh(geo, mat, 1000);
        selectionCirclesIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        selectionCirclesIM.visible = false;
        scene.add(selectionCirclesIM);

        // Anel de seleção para catapultas (raio 2.5 a 4.2)
        const catGeo = new THREE.RingGeometry(2.5, 4.2, 24);
        catGeo.rotateX(-Math.PI / 2);
        const catMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        selectionCatapultCirclesIM = new THREE.InstancedMesh(catGeo, catMat, 20);
        selectionCatapultCirclesIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        selectionCatapultCirclesIM.visible = false;
        scene.add(selectionCatapultCirclesIM);
    }

    if (window.selectedBrigadeId && window.AICommanderSystem) {
        let brigade = window.AICommanderSystem.knightGeneral.brigades.find(b => b.id === window.selectedBrigadeId);
        let isPlayer = true;
        
        if (!brigade) {
            brigade = window.AICommanderSystem.goblinGeneral.brigades.find(b => b.id === window.selectedBrigadeId);
            isPlayer = false;
        }

        if (brigade) {
            const colorHex = isPlayer ? 0x3b82f6 : 0xef4444; // Azul ou Vermelho
            selectionCirclesIM.material.color.setHex(colorHex);
            selectionCatapultCirclesIM.material.color.setHex(colorHex);
            
            let count = 0;
            let catCount = 0;
            const time = performance.now() * 0.002;
            const pulseScale = 1 + Math.sin(time * 4) * 0.15;
            
            // 1. Soldados nas formações (Guerreiros e Arqueiros)
            if (brigade.formations && brigade.formations.length > 0) {
                for (const f of brigade.formations) {
                    for (const s of f.soldiers) {
                        if (!s.isDead && count < 1000) {
                            const groundY = (s.terrainY !== undefined ? s.terrainY : (s.y ? s.y - 1.5 : 0)) + 0.15;
                            _dummyCircle.position.set(s.x, groundY, s.z);
                            _dummyCircle.scale.set(pulseScale, 1, pulseScale);
                            _dummyCircle.rotation.y = time;
                            _dummyCircle.updateMatrix();
                            selectionCirclesIM.setMatrixAt(count, _dummyCircle.matrix);
                            count++;
                        }
                    }
                }
            }

            // 2. Catapultas e Empurradores
            if (window.battleManager && window.battleManager.getCatapults) {
                const catapults = window.battleManager.getCatapults();
                for (const c of catapults) {
                    if (c.brigada === brigade || (c.brigada && c.brigada.id === brigade.id)) {
                        if (!c.isDead && catCount < 20) {
                            const groundY = (c.terrainY !== undefined ? c.terrainY : 0) + 0.15;
                            _dummyCircle.position.set(c.x, groundY, c.z);
                            _dummyCircle.scale.set(pulseScale, 1, pulseScale);
                            _dummyCircle.rotation.y = time;
                            _dummyCircle.updateMatrix();
                            selectionCatapultCirclesIM.setMatrixAt(catCount, _dummyCircle.matrix);
                            catCount++;
                        }
                        if (c.pushers) {
                            for (const p of c.pushers) {
                                if (!p.isDead && count < 1000) {
                                    const groundY = (p.terrainY !== undefined ? p.terrainY : (p.y ? p.y - 1.5 : 0)) + 0.15;
                                    _dummyCircle.position.set(p.x, groundY, p.z);
                                    _dummyCircle.scale.set(pulseScale, 1, pulseScale);
                                    _dummyCircle.rotation.y = time;
                                    _dummyCircle.updateMatrix();
                                    selectionCirclesIM.setMatrixAt(count, _dummyCircle.matrix);
                                    count++;
                                }
                            }
                        }
                    }
                }
            }
            
            selectionCirclesIM.count = count;
            selectionCirclesIM.instanceMatrix.needsUpdate = true;
            selectionCirclesIM.visible = (count > 0);

            selectionCatapultCirclesIM.count = catCount;
            selectionCatapultCirclesIM.instanceMatrix.needsUpdate = true;
            selectionCatapultCirclesIM.visible = (catCount > 0);
            return;
        }
    }
    
    if (selectionCirclesIM) selectionCirclesIM.visible = false;
    if (selectionCatapultCirclesIM) selectionCatapultCirclesIM.visible = false;
}

function animate() {
    if (window.PerformanceProfiler) window.PerformanceProfiler.startFrame();
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

        if (window.CombatProfiler) window.CombatProfiler.startFrame();

        if (window.populateSpatialGrid) {
            if (window.CombatProfiler) window.CombatProfiler.start('atualização da Spatial Grid');
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('spatial_grid');
            window.populateSpatialGrid();
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('spatial_grid');
            if (window.CombatProfiler) window.CombatProfiler.end('atualização da Spatial Grid');
        }

        if (window.AICommanderSystem) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('ai_commander');
            window.AICommanderSystem.update(now);
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('ai_commander');
        }

        for (let i = knights.length - 1; i >= 0; i--) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('lod');
            knights[i].updateLOD(cameraPos, maxDistSq, medDistSq);
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('lod');
            knights[i].update(goblins, dt, simulationSpeed);
        }

        for (let i = goblins.length - 1; i >= 0; i--) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('lod');
            goblins[i].updateLOD(cameraPos, maxDistSq, medDistSq);
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('lod');
            goblins[i].update(knights, dt, simulationSpeed);
        }

        if (window.PerformanceProfiler) window.PerformanceProfiler.start('colisoes');
        resolveWarriorCollisions();
        if (window.PerformanceProfiler) window.PerformanceProfiler.end('colisoes');

        for (let i = arrows.length - 1; i >= 0; i--) {
            const arrow = arrows[i];
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('flechas');
            arrow.update(dt, simulationSpeed);
            if (arrow.isDead) {
                ArrowPool.release(arrow);
                arrows.splice(i, 1);
            }
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('flechas');
        }

        if (window.CombatProfiler) window.CombatProfiler.start('remoção de mortos');
        for (let i = deadWarriors.length - 1; i >= 0; i--) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('lod');
            deadWarriors[i].updateLOD(cameraPos, maxDistSq, medDistSq);
            if (window.PerformanceProfiler) {
                window.PerformanceProfiler.end('lod');
                window.PerformanceProfiler.start('ia_guerreiros');
            }
            const completelySunk = deadWarriors[i].fadeAndSink(dt * simulationSpeed);
            if (completelySunk) {
                deadWarriors.splice(i, 1);
            }
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('ia_guerreiros');
        }
        if (window.CombatProfiler) window.CombatProfiler.end('remoção de mortos');

        if (window.CombatProfiler) window.CombatProfiler.endFrame();

        // Animação das nuvens (deriva pelo céu)
        if (window.PerformanceProfiler) window.PerformanceProfiler.start('nuvens');
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
        if (window.PerformanceProfiler) window.PerformanceProfiler.end('nuvens');
        
        if (window.PerformanceProfiler) window.PerformanceProfiler.start('chuva');
        updateRain(dt);
        updateLightning(dt);
        if (window.PerformanceProfiler) window.PerformanceProfiler.end('chuva');

        if (window.PerformanceProfiler) window.PerformanceProfiler.start('particulas');
        updateParticles(dt);
        if (window.PerformanceProfiler) window.PerformanceProfiler.end('particulas');

        for (let i = 0; i < catapults.length; i++) {
            const c = catapults[i];
            if (c.isDead) continue;
            const opp = window.armies[c.faction].enemies;
            
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('lod');
            c.updateLOD(cameraPos, maxDistSq);
            if (window.PerformanceProfiler) {
                window.PerformanceProfiler.end('lod');
                window.PerformanceProfiler.start('catapultas');
            }
            c.update(opp, dt, simulationSpeed);
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('catapultas');
        }

        for (let i = boulders.length - 1; i >= 0; i--) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('projeteis');
            boulders[i].update(dt, simulationSpeed);
            if (boulders[i].isDead) {
                BoulderPool.release(boulders[i]);
                boulders.splice(i, 1);
            }
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('projeteis');
        }

        // Flush dos contadores do HUD: no máximo 1x por frame, por mais mortes que tenham ocorrido
        if (window.hudCountersDirty) {
            window.hudCountersDirty = false;
            HUD.updateKills(battleManager.getKills());
            HUD.updateArmyCounts(battleManager.getKnights().length, battleManager.getGoblins().length);
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
    renderSelectionMarker();
    
    if (window.PerformanceProfiler) window.PerformanceProfiler.start('render_unidades');
    renderer.render(scene, camera);
    if (window.PerformanceProfiler) {
        window.PerformanceProfiler.end('render_unidades');
        window.PerformanceProfiler.endFrame();
    }
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
    if (e.key.toLowerCase() === 'p') {
        window.profilerPanelsVisible = !window.profilerPanelsVisible;
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