// --- CLASSE DO GUERREIRO MULTI-FUNÇÕES ---
let warriorUidCounter = 0;
const _spawnPosCache = new THREE.Vector3();

function getTargetX(t) { return t ? (t.x !== undefined ? t.x : (t.mesh ? t.mesh.position.x : 0)) : 0; }
function getTargetY(t) { return t ? (t.y !== undefined ? t.y : (t.mesh ? t.mesh.position.y : 0)) : 0; }
function getTargetZ(t) { return t ? (t.z !== undefined ? t.z : (t.mesh ? t.mesh.position.z : 0)) : 0; }
function getTargetPos(t, out = new THREE.Vector3()) {
    if (!t) return out.set(0, 0, 0);
    return out.set(getTargetX(t), getTargetY(t), getTargetZ(t));
}

function mergeGeometries(geos) {
    let totalVertices = 0;
    const preparedGeos = geos.map(g => {
        let geo = g.geometry;
        if (geo.index) {
            geo = geo.toNonIndexed();
        } else {
            geo = geo.clone();
        }
        geo.applyMatrix4(g.matrix);
        totalVertices += geo.attributes.position.count;
        return {
            geo: geo,
            color: g.color
        };
    });

    const positions = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const uvs = new Float32Array(totalVertices * 2);
    const colors = new Float32Array(totalVertices * 3);

    let offset = 0;
    preparedGeos.forEach(p => {
        const geo = p.geo;
        const posAttr = geo.attributes.position;
        const normAttr = geo.attributes.normal;
        const uvAttr = geo.attributes.uv;

        const count = posAttr.count;

        positions.set(posAttr.array, offset * 3);

        if (normAttr) {
            normals.set(normAttr.array, offset * 3);
        }

        if (uvAttr) {
            uvs.set(uvAttr.array, offset * 2);
        }

        const c = p.color || new THREE.Color(0xffffff);
        for (let i = 0; i < count; i++) {
            colors[(offset + i) * 3] = c.r;
            colors[(offset + i) * 3 + 1] = c.g;
            colors[(offset + i) * 3 + 2] = c.b;
        }

        offset += count;
        geo.dispose();
    });

    const mergedGeo = new THREE.BufferGeometry();
    mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    mergedGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return mergedGeo;
}

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

window.sharedMergedMaterial = new THREE.MeshLambertMaterial({
    vertexColors: true
});

function getMergedGeometryForGroup(group, faction) {
    const geos = [];
    group.traverse(child => {
        if (child.updateMatrix) child.updateMatrix();
    });
    group.updateMatrixWorld(true);

    group.traverse(child => {
        if (child.isMesh && child.name !== 'lodPrimitive') {
            const relativeMatrix = new THREE.Matrix4().copy(group.matrixWorld).invert().multiply(child.matrixWorld);

            let color = new THREE.Color(0xffffff);
            if (child.material) {
                if (child.material.color) {
                    color.copy(child.material.color);
                }
                if (child.material.map) {
                    if (child.name === 'shield') {
                        color.copy(faction === 'knights' ? new THREE.Color(0x1f3c73) : new THREE.Color(0xb32424));
                    } else if (child.name === 'torso') {
                        color.copy(faction === 'knights' ? new THREE.Color(0x2c3e50) : new THREE.Color(0x5c7a43));
                    }
                }
            }

            geos.push({
                geometry: child.geometry,
                matrix: relativeMatrix,
                color: color
            });
        }
    });

    if (geos.length === 0) return null;
    return mergeGeometries(geos);
}

class Warrior {
    clone() { return {x:this.x, y:this.y, z:this.z}; }
    set(x,y,z) { this.x=x; this.y=y; this.z=z; }
    constructor(faction, role, x, z, isPusher = false, catapult = null) {
        this.uid = warriorUidCounter++;
        this.isWarrior = true; // Flag para renderList evitar comparação de string com constructor.name
        this._armyIndex = -1; // Índice na lista do exército para remoção O(1) (swap-and-pop)
        this.faction = faction;
        this.role = role;
        this.isPusher = isPusher;
        this.isFlanker = (role === 'melee' && !isPusher && Math.random() < flankRatio);
        this.catapult = catapult;
        this.id = faction + "_" + role + "_" + Math.floor(Math.random() * 100000);

        this.isDaggerArcher = (role === 'archer' && Math.random() < 0.20);
        this.ammo = ((role === 'archer' || isNapoleonicTheme()) && !this.isDaggerArcher) ? CONFIG.ARCHER_AMMO : 0;

        this.hp = (role === 'melee') ? 220 : 100;
        this.maxHp = this.hp;

        const army = window.armies[faction];
        const baseSpeed = (role === 'melee') ? army.baseSpeedMelee : army.baseSpeedArcher;
        this.speed = (baseSpeed + Math.random() * 0.02) * 60;

        // Força individual do soldado: média do exército ± variância (sliders do HUD)
        if (typeof CONFIG !== 'undefined' && CONFIG.STRENGTH_SYSTEM_ENABLED) {
            const sv = CONFIG.STRENGTH_SOLDIER_VARIANCE;
            const atkMean = army.attackStrength || CONFIG.STRENGTH_BASELINE;
            const defMean = army.defenseStrength || CONFIG.STRENGTH_BASELINE;
            this.attackStrength = Math.max(20, Math.round(atkMean * (1 - sv + Math.random() * 2 * sv)));
            this.defenseStrength = Math.max(20, Math.round(defMean * (1 - sv + Math.random() * 2 * sv)));
        } else {
            this.attackStrength = 70;
            this.defenseStrength = 70;
        }

        this.attackRange = isNapoleonicTheme() ? 100.0 : (((role === 'melee' || this.isDaggerArcher)) ? 2.8 : 100.0);
        this.keepDistanceRange = 0; // Archers will stand their ground and shoot point-blank instead of running away
        this.attackCooldown = 0;
        this.isDead = false;
        this.attackers = new Set();
        this.isSupporting = false;
        this.supportAngle = 0;
        this.setTarget(null);

        this.animTime = Math.random() * 100;
        this.isAttacking = false;
        this.attackAnimProgress = 0;
        this.radius = 1.1;
        this.flashTimer = 0;

        this.knockback = new THREE.Vector3();
        this.knockbackTimer = 0;
        this.launchVY = 0;
        this.launchKills = false;
        this.tumbleX = 0;
        this.tumbleY = 0;
        this.tumbleZ = 0;

        this.lastVelocity = new THREE.Vector3();
        this.lastTargetAngle = 0;
        this.isKiting = false;

        this.morale = 50 + Math.floor(Math.random() * 21); // 50 to 70
        this.isFleeing = false;
        this.fleeStartX = 0;
        this.fleeStartZ = 0;
        this.fleeTimer = 0;
        this.hasRetreated50m = false;

        this.aiTick = Math.floor(Math.random() * 24);

        this.stuckTimer = 0;
        this.stuckDuration = 0;
        this.stuckAngleOffset = 0;
        this.isTryingToMove = false;
        this.attackerCount = 0;
        this.lodLevel = 0;

        this.fatigue = 100;
        this.formationTarget = null;

        this.assembleBody();

        const terrainY = getTerrainHeight(x, z);
        this.terrainY = terrainY;
        this.set(x, terrainY + 1.5, z);
        this.rotY = window.armies[faction].rotationY;
        this.lastTargetAngle = this.rotY;

        // State Machine & Dirty Flags Optimization Setup
        this.currentState = this.isFlanker ? 'FLANKING' : 'ADVANCING';
        this.stateDirty = true;

        // Dirty Flags Optimization Setup
        this.positionDirty = true;
        this.rotationDirty = true;
        this.visibilityDirty = true;
        this.colorDirty = true;
        this.lodDirty = true;
        this.matrixDirty = true;

        this._lastX = undefined;
        this._lastY = undefined;
        this._lastZ = undefined;
        this._lastRotX = undefined;
        this._lastRotY = undefined;
        this._lastRotZ = undefined;
        this._lastVisible = undefined;
        this._lastFlashed = undefined;
        this._lastBaseColor = null;
        this._lastLodLevel = undefined;
        this._lastAnimTime = undefined;
    }

    assembleBody() {
        if (!templateMeshes[this.faction][this.role]) {
            const template = new THREE.Group();

            const lodMat = window.armies[this.faction].lodMat();
            const lodGeo = (this.role === 'melee') ? lodGeoCube : lodGeoCircle;
            const lodPrimitive = new THREE.Mesh(lodGeo, lodMat);
            lodPrimitive.name = 'lodPrimitive';
            lodPrimitive.position.y = 1.5;
            lodPrimitive.visible = false;
            template.add(lodPrimitive);

            if (currentTheme === 'napoleonic_3d') {
                // --- TEMA NAPOLEÓNICO 3D (Substituído pelo modelo Low-Poly ultra leve pedido ~84 Tris) ---
                const isFrench = window.armies[this.faction].isFrench;
                const coatMat = new THREE.MeshLambertMaterial({ color: isFrench ? 0x1f3c73 : 0xb32424 });
                const skinMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
                const pantsMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
                const gunMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

                const torso = new THREE.Group(); torso.name = "torso"; torso.position.y = 0.525; template.add(torso);
                const chest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.45), coatMat);
                chest.position.y = 0.55;
                torso.add(chest);

                const head = new THREE.Group(); head.name = "head"; head.position.y = 1.15; torso.add(head);
                const skull = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
                skull.position.y = 0.225;
                head.add(skull);

                const armL = new THREE.Group(); armL.name = "armL"; armL.position.set(-0.55, 1.275, 0); template.add(armL);
                const sleeveL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), coatMat);
                sleeveL.position.y = -0.4;
                armL.add(sleeveL);

                const armR = new THREE.Group(); armR.name = "armR"; armR.position.set(0.55, 1.275, 0); template.add(armR);
                const sleeveR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), coatMat);
                sleeveR.position.y = -0.4;
                armR.add(sleeveR);
                
                const bowGroup = new THREE.Group(); bowGroup.name = "bowGroup";
                const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 1.8), gunMat);
                gunMesh.position.set(0, 0, 0.5);
                bowGroup.add(gunMesh);
                armR.add(bowGroup);

                const legL = new THREE.Group(); legL.name = "legL"; legL.position.set(-0.25, 0.525, 0); template.add(legL);
                const pantsL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), pantsMat);
                pantsL.position.y = -0.35;
                legL.add(pantsL);

                const legR = new THREE.Group(); legR.name = "legR"; legR.position.set(0.25, 0.525, 0); template.add(legR);
                const pantsR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), pantsMat);
                pantsR.position.y = -0.35;
                legR.add(pantsR);

                templateMeshes[this.faction][this.role] = template;
            } else if (currentTheme === 'napoleonic') {
                const isFrench = window.armies[this.faction].isFrench;
                const coatColor = isFrench ? 0x1f3c73 : 0xb32424;
                const collarColor = isFrench ? 0xb32424 : 0x1f3c73;
                const plumeColor = isFrench ? 0x2196F3 : 0xf44336;
                const epauletteColor = isFrench ? 0xb32424 : 0xffffff;

                const coatMat = new THREE.MeshLambertMaterial({ color: coatColor });
                const collarMat = new THREE.MeshLambertMaterial({ color: collarColor });
                const plumeMat = new THREE.MeshLambertMaterial({ color: plumeColor });
                const epauletteMat = new THREE.MeshLambertMaterial({ color: epauletteColor });
                const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
                const blackMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
                const goldMat = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
                const brownMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
                const skinMat = skinFleshMat;

                const torso = new THREE.Mesh(geomBody, coatMat);
                torso.name = "torso";
                torso.position.y = 0.525;
                template.add(torso);

                const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.9, 0.05), whiteMat);
                strap1.position.set(0, 0, 0.41);
                strap1.rotation.z = 0.4;
                torso.add(strap1);

                const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.9, 0.05), whiteMat);
                strap2.position.set(0, 0, 0.415);
                strap2.rotation.z = -0.4;
                torso.add(strap2);

                const strap1Back = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.9, 0.05), whiteMat);
                strap1Back.position.set(0, 0, -0.41);
                strap1Back.rotation.z = -0.4;
                torso.add(strap1Back);

                const strap2Back = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.9, 0.05), whiteMat);
                strap2Back.position.set(0, 0, -0.415);
                strap2Back.rotation.z = 0.4;
                torso.add(strap2Back);

                const collar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.6), collarMat);
                collar.position.y = 0.95;
                torso.add(collar);

                const epauletteL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.45), epauletteMat);
                epauletteL.position.set(-0.6, 0.9, 0);
                torso.add(epauletteL);

                const epauletteR = epauletteL.clone();
                epauletteR.position.x = 0.6;
                torso.add(epauletteR);

                const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.35), brownMat);
                backpack.position.set(0, 0.1, 0.58);
                torso.add(backpack);

                const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 5), whiteMat);
                bedroll.rotation.z = Math.PI / 2;
                bedroll.position.set(0, 0.65, 0.58);
                torso.add(bedroll);

                const head = new THREE.Mesh(geomHead, skinMat);
                head.name = "head";
                head.position.y = 1.825;
                template.add(head);

                const eyeL = new THREE.Mesh(geomEye, eyeMat);
                eyeL.name = "eyeL";
                eyeL.position.set(-0.2, 0.15, -0.41);
                head.add(eyeL);

                const eyeR = new THREE.Mesh(geomEye, eyeMat);
                eyeR.name = "eyeR";
                eyeR.position.set(0.2, 0.15, -0.41);
                head.add(eyeR);

                if (!isFrench) {
                    const shako = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 0.75, 6), blackMat);
                    shako.position.y = 0.65;
                    shako.rotation.y = Math.PI / 6;
                    head.add(shako);

                    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.28), blackMat);
                    visor.position.set(0, 0.3, -0.42);
                    visor.rotation.x = 0.15;
                    head.add(visor);

                    const shakoTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.43, 0.08, 6), goldMat);
                    shakoTrim.position.y = 0.65 + 0.33;
                    shakoTrim.rotation.y = Math.PI / 6;
                    head.add(shakoTrim);

                    const shakoTrimBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.425, 0.06, 6), goldMat);
                    shakoTrimBottom.position.y = 0.65 - 0.33;
                    shakoTrimBottom.rotation.y = Math.PI / 6;
                    head.add(shakoTrimBottom);

                    const plume = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.5, 4), plumeMat);
                    plume.position.set(0, 1.1, -0.2);
                    plume.rotation.x = -0.1;
                    head.add(plume);

                    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02), goldMat);
                    plate.position.set(0, 0.65, -0.42);
                    head.add(plate);
                }

                const armL = new THREE.Mesh(geomArm, coatMat);
                armL.name = "armL";
                armL.position.set(-0.85, 1.275, 0);
                template.add(armL);

                const armR = new THREE.Mesh(geomArmStraight, coatMat);
                armR.name = "armR";
                armR.position.set(0.85, 1.275, 0);
                armR.rotation.set(0.43, 0, -0.05);
                template.add(armR);

                const cuffL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), collarMat);
                cuffL.position.set(0, -0.65, -0.22);
                armL.add(cuffL);

                const cuffR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), collarMat);
                cuffR.position.set(0, -1.2, 0);
                armR.add(cuffR);

                const bowGroup = new THREE.Group();
                bowGroup.name = "bowGroup";

                const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 2.2), brownMat);
                stock.position.set(0, 0, 0.1);
                bowGroup.add(stock);

                const butt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.6), brownMat);
                butt.position.set(0, -0.12, -0.9);
                bowGroup.add(butt);

                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 4), steelMaterial);
                barrel.rotation.x = Math.PI / 2;
                barrel.position.set(0, 0.08, 0.35);
                bowGroup.add(barrel);

                const bayonet = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.45), steelMaterial);
                bayonet.position.set(0, 0.08, 1.55);
                bowGroup.add(bayonet);

                const stringPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
                const stringGeo = new THREE.BufferGeometry().setFromPoints(stringPoints);
                const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff, visible: false });
                const bowString = new THREE.Line(stringGeo, stringMat);
                bowString.name = "bowString";
                bowGroup.add(bowString);

                bowGroup.position.set(0, -0.1, -0.3);
                bowGroup.rotation.set(-1.55, 0, 0);
                armR.add(bowGroup);

                const legL = new THREE.Group();
                legL.name = "legL";
                legL.position.set(-0.32, -0.375, 0);
                const pantsL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.45), whiteMat);
                pantsL.position.y = -0.375;
                legL.add(pantsL);
                const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.55, 0.47), blackMat);
                bootL.position.y = -0.85;
                legL.add(bootL);
                template.add(legL);

                const legR = new THREE.Group();
                legR.name = "legR";
                legR.position.set(0.32, -0.375, 0);
                const pantsR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.45), whiteMat);
                pantsR.position.y = -0.375;
                legR.add(pantsR);
                const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.55, 0.47), blackMat);
                bootR.position.y = -0.85;
                legR.add(bootR);
                template.add(legR);

                template.traverse(child => {
                    if (child.isMesh) {
                        child.frustumCulled = false;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                templateMeshes[this.faction][this.role] = template;
            } else {
                const bodyMat = sharedBodyMaterials[this.faction][this.role];

                const torso = new THREE.Mesh(geomBody, bodyMat);
                torso.name = "torso";
                template.add(torso);

                if (this.role === 'archer') {
                    const quiverGroup = new THREE.Group();
                    quiverGroup.name = "quiverGroup";
                    const quiver = new THREE.Mesh(geomQuiver, quiverMaterial);
                    quiverGroup.add(quiver);

                    for (let i = 0; i < 2; i++) {
                        const shaft = new THREE.Mesh(geomQuiverArrowShaft, woodMaterial);
                        shaft.position.set((Math.random() - 0.5) * 0.1, 0.5, (Math.random() - 0.5) * 0.1);
                        quiverGroup.add(shaft);
                    }
                    quiverGroup.position.set(0.3, 0.2, 0.52);
                    quiverGroup.rotation.z = -Math.PI / 6;
                    torso.add(quiverGroup);
                }

                const headMat = window.armies[this.faction].headMat();
                const head = new THREE.Mesh(geomHead, headMat);
                head.name = "head";
                head.position.y = 1.3;
                template.add(head);

                const eyeL = new THREE.Mesh(geomEye, eyeMat);
                eyeL.name = "eyeL";
                eyeL.position.set(-0.2, 0.15, -0.41);
                head.add(eyeL);

                const eyeR = new THREE.Mesh(geomEye, eyeMat);
                eyeR.name = "eyeR";
                eyeR.position.set(0.2, 0.15, -0.41);
                head.add(eyeR);

                if (this.faction === 'knights') {
                    // Retirado o capacete (chapeuzinho) do soldado do exército azul a pedido do usuário
                } else {
                    const earL = new THREE.Mesh(geomEar, skinGreenMat);
                    earL.name = "earL";
                    earL.rotation.z = Math.PI / 3;
                    earL.position.set(-0.45, 0, 0);
                    head.add(earL);

                    const earR = earL.clone();
                    earR.name = "earR";
                    earR.rotation.z = -Math.PI / 2.5;
                    earR.position.set(0.45, 0, 0);
                    head.add(earR);
                }

                const armL = new THREE.Mesh((this.role === 'melee') ? geomArmL : geomArm, bodyMat);
                armL.name = "armL";
                armL.position.set(-0.85, 0.75, 0);
                template.add(armL);

                const armR = new THREE.Mesh(geomArm, bodyMat);
                armR.name = "armR";
                armR.position.set(0.85, 0.75, 0);
                template.add(armR);

                if (this.role === 'melee') {
                    const shieldMat = shieldMaterials[this.faction];
                    const shield = new THREE.Mesh(geomShield, shieldMat);
                    shield.name = "shield";
                    shield.position.set(0.38, -0.1, -0.73);
                    shield.rotation.y = 0.2;
                    armL.add(shield);

                    const swordGroup = new THREE.Group();
                    swordGroup.name = "swordGroup";
                    const blade = new THREE.Mesh(geomSwordBlade, window.armies[this.faction].bladeMat());
                    blade.position.y = 0.75;
                    swordGroup.add(blade);

                    const guard = new THREE.Mesh(geomSwordHilt, steelMaterial);
                    guard.rotation.z = Math.PI / 2;
                    swordGroup.add(guard);

                    swordGroup.position.set(0, -0.55, -0.45);
                    swordGroup.rotation.x = -50 * Math.PI / 180;
                    armR.add(swordGroup);
                } else {
                    const bowGroup = new THREE.Group();
                    bowGroup.name = "bowGroup";

                    const limbTop = new THREE.Mesh(geomBowLimb, woodMaterial);
                    limbTop.position.set(0, 0.4, 0.13);
                    limbTop.rotation.x = 0.3;
                    bowGroup.add(limbTop);

                    const limbBottom = new THREE.Mesh(geomBowLimb, woodMaterial);
                    limbBottom.position.set(0, -0.4, 0.13);
                    limbBottom.rotation.x = -0.3;
                    bowGroup.add(limbBottom);

                    const grip = new THREE.Mesh(geomBowGrip, woodMaterial);
                    bowGroup.add(grip);

                    const stringPoints = [
                        new THREE.Vector3(0, 0.72, 0.2),
                        new THREE.Vector3(0, 0, 0.16),
                        new THREE.Vector3(0, -0.72, 0.2)
                    ];

                    const stringGeo = new THREE.BufferGeometry().setFromPoints(stringPoints);
                    const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff });
                    const bowString = new THREE.Line(stringGeo, stringMat);
                    bowString.name = "bowString";
                    bowGroup.add(bowString);

                    bowGroup.position.set(0, -0.55, -0.45);
                    bowGroup.rotation.set(0, 0, 0);
                    armL.add(bowGroup);
                }

                const legL = new THREE.Mesh(geomLeg, bodyMat);
                legL.name = "legL";
                legL.position.set(-0.32, -0.9, 0);
                template.add(legL);

                const legR = new THREE.Mesh(geomLeg, bodyMat);
                legR.name = "legR";
                legR.position.set(0.32, -0.9, 0);
                template.add(legR);

                template.traverse(child => {
                    if (child.isMesh) {
                        child.frustumCulled = false;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                templateMeshes[this.faction][this.role] = template;
            }
            if (currentTheme !== 'napoleonic_3d') {
                const rawTemplate = templateMeshes[this.faction][this.role];
                const faction = this.faction;
                const role = this.role;
                const anims = window.animatedGeometries[faction][role];
                
                if (rawTemplate && !anims.idle) {
                    // Create a mock warrior to apply poses
                    const mock = {
                        faction: faction,
                        role: role,
                        isDead: false,
                        isAttacking: false,
                        attackAnimProgress: 0,
                        isTryingToMove: false,
                        animTime: 0,
                        knockback: null,
                        isPusher: false,
                        hasTorch: false,
                        isDaggerArcher: false,
                        dummy: rawTemplate,
                        lodLevel: 0,
                        cacheDummyParts: Warrior.prototype.cacheDummyParts
                    };
                    
                    // 1. Idle geometry
                    Warrior.prototype.applyPoseToDummy.call(mock, rawTemplate);
                    anims.idle = getMergedGeometryForGroup(rawTemplate, faction);
                    
                    // 2. Walk geometries (8 frames)
                    for (let i = 0; i < 8; i++) {
                        const animTime = (i / 8) * 2 * Math.PI;
                        mock.isTryingToMove = true;
                        mock.animTime = animTime;
                        mock.isAttacking = false;
                        Warrior.prototype.applyPoseToDummy.call(mock, rawTemplate);
                        anims.walk.push(getMergedGeometryForGroup(rawTemplate, faction));
                    }
                    
                    // 3. Attack geometries (6 frames)
                    for (let i = 0; i < 6; i++) {
                        const progress = i / 5;
                        mock.isTryingToMove = false;
                        mock.isAttacking = true;
                        mock.attackAnimProgress = progress;
                        Warrior.prototype.applyPoseToDummy.call(mock, rawTemplate);
                        anims.attack.push(getMergedGeometryForGroup(rawTemplate, faction));
                    }
                    
                    // Restore template to idle pose
                    mock.isTryingToMove = false;
                    mock.isAttacking = false;
                    Warrior.prototype.applyPoseToDummy.call(mock, rawTemplate);
                }
            }
        }

        this.baseColor = new THREE.Color(0xffffff);
        if (this.isPusher) {
            const colorHex = window.armies[this.faction].colorHex;
            this.baseColor.setHex(colorHex);
            this.scale = 1.15;
        } else {
            this.scale = 1.0;
        }
        this.visible = true;

        const template = templateMeshes[this.faction][this.role];
        if (template) {
            this.dummy = template.clone();
        } else {
            this.dummy = new THREE.Group();
        }
    }
    getAvoidanceDir(dir) {
        if (this.lodLevel >= 2) return dir; // Skip avoidance entirely for very far units!
        if (this.stuckDuration > 0) {
            return _tmpVec3C.copy(dir).applyAxisAngle(_axisY, this.stuckAngleOffset);
        }

        if (window.PerformanceProfiler) window.PerformanceProfiler.start('desvio_obstaculos');
        const px = this.x;
        const pz = this.z;

        let repelX = 0;
        let repelZ = 0;

        // 1. Desvio de Árvores em Pé - Otimizado com spatial grid
        if (window._treeGrid) {
            const halfX = 500 + 50;
            const halfZ = 500 + 50;
            const wCol = Math.max(0, Math.min(window._treeGridCols - 1, Math.floor((px + halfX) / window._treeGridSize)));
            const wRow = Math.max(0, Math.min(window._treeGridRows - 1, Math.floor((pz + halfZ) / window._treeGridSize)));
            const avoidanceRadius = 3.2;
            const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;
            
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
                        
                        if (distSq < avoidanceRadiusSq) {
                            const dist = Math.sqrt(distSq) || 0.001;
                            const force = ((avoidanceRadius - dist) / avoidanceRadius) * 2.0;
                            repelX += (dx / dist) * force;
                            repelZ += (dz / dist) * force;
                        }
                    }
                }
            }
        } else {
            // Fallback se o grid não estiver pronto
            for (let i = 0; i < treePositions.length; i++) {
                const tree = treePositions[i];
                const dx = px - tree.x;
                const dz = pz - tree.z;
                const distSq = dx * dx + dz * dz;
                const avoidanceRadius = 3.2;
                const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;

                if (distSq < avoidanceRadiusSq) {
                    const dist = Math.sqrt(distSq) || 0.001;
                    const force = ((avoidanceRadius - dist) / avoidanceRadius) * 2.0;
                    repelX += (dx / dist) * force;
                    repelZ += (dz / dist) * force;
                }
            }
        }

        // 2. Desvio de Troncos Caídos
        for (let i = 0; i < fallenLogs.length; i++) {
            const log = fallenLogs[i];
            const abx = log.bx - log.ax;
            const abz = log.bz - log.az;
            const apx = px - log.ax;
            const apz = pz - log.az;
            const ab2 = abx * abx + abz * abz;
            if (ab2 === 0) continue;

            const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / ab2));
            const cx = log.ax + t * abx;
            const cz = log.az + t * abz;
            const dx = px - cx;
            const dz = pz - cz;
            const distSq = dx * dx + dz * dz;
            const avoidanceRadius = log.radius + 2.5;
            const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;

            if (distSq < avoidanceRadiusSq) {
                const dist = Math.sqrt(distSq) || 0.001;
                const force = ((avoidanceRadius - dist) / avoidanceRadius) * 2.0;
                repelX += (dx / dist) * force;
                repelZ += (dz / dist) * force;
            }
        }

        // 3. Desvio de Lagos
        for (let i = 0; i < lakes.length; i++) {
            const lake = lakes[i];
            const dx = px - lake.x;
            const dz = pz - lake.z;
            const distSq = dx * dx + dz * dz;
            const avoidanceRadius = lake.r + 2.0;
            const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;

            if (distSq < avoidanceRadiusSq) {
                const dist = Math.sqrt(distSq) || 0.001;
                const force = ((avoidanceRadius - dist) / avoidanceRadius) * 4.0;
                repelX += (dx / dist) * force;
                repelZ += (dz / dist) * force;
            }
        }

        // 4. Desvio de Catapultas (não desvia se a catapulta for o alvo do guerreiro)
        const catapults = battleManager.getCatapults();
        for (let i = 0; i < catapults.length; i++) {
            const cat = catapults[i];
            if (cat.isDead) continue;
            if (this.target === cat) continue;

            const dx = px - cat.mesh.position.x;
            const dz = pz - cat.mesh.position.z;
            const distSq = dx * dx + dz * dz;
            const avoidanceRadius = cat.radius + 2.5; // ~5.0m
            const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;

            if (distSq < avoidanceRadiusSq) {
                const dist = Math.sqrt(distSq) || 0.001;
                const force = ((avoidanceRadius - dist) / avoidanceRadius) * 2.5;
                repelX += (dx / dist) * force;
                repelZ += (dz / dist) * force;
            }
        }

        if (window.PerformanceProfiler) {
            window.PerformanceProfiler.end('desvio_obstaculos');
            window.PerformanceProfiler.start('desvio_aliados');
        }

        // 5. Desvio de Aliados Engajados / Parados para evitar empurrões por trás e manter as fileiras organizadas
        this._isBlockedByAlly = false;
        let blockScore = 0;

        if (window.spatialGrid && window.GRID_COLS && window.GRID_CELL_SIZE) {
            const gridCols = window.GRID_COLS;
            const cellSize = window.GRID_CELL_SIZE;
            const halfX = (typeof sizeX !== 'undefined' ? sizeX : 1000) / 2 + 10;
            const halfZ = (typeof sizeZ !== 'undefined' ? sizeZ : 1000) / 2 + 10;
            
            const col = Math.max(0, Math.min(gridCols - 1, Math.floor((px + halfX) / cellSize)));
            const row = Math.max(0, Math.min(window.GRID_ROWS - 1, Math.floor((pz + halfZ) / cellSize)));
            
            const avoidanceRadius = 3.5;
            const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;
            
            for (let cOff = -1; cOff <= 1; cOff++) {
                for (let rOff = -1; rOff <= 1; rOff++) {
                    const c = col + cOff;
                    const r = row + rOff;
                    if (c < 0 || c >= gridCols || r < 0 || r >= window.GRID_ROWS) continue;
                    
                    const cell = window.spatialGrid[c + r * gridCols];
                    if (!cell || cell.length === 0) continue;
                    
                    if (window.CombatProfiler) window.CombatProfiler.start('qualquer loop sobre aliados');
                    for (let i = 0; i < cell.length; i++) {
                        const ally = cell[i];
                        if (ally === this || ally.isDead || ally.faction !== this.faction) continue;
                        
                        // Verifica se o aliado está parado ou engajado (não bloqueia cascata de WAITING)
                        const isAllyEngaged = (ally.role === 'melee' && ally.target && !ally.target.isDead && (ally.lastVelocity.lengthSq() < 0.1 || ally.isAttacking));
                        if (!isAllyEngaged) continue;
                        
                        const dx = px - ally.x;
                        const dz = pz - ally.z;
                        const distSq = dx * dx + dz * dz;
                        
                        if (distSq < avoidanceRadiusSq && distSq > 0.001) {
                            const dist = Math.sqrt(distSq);
                            
                            // Vetor relativo deste para o aliado
                            const relX = ally.x - px;
                            const relZ = ally.z - pz;
                            
                            // Produto escalar frontal: se > 0, o aliado está na nossa frente
                            const dotForward = relX * dir.x + relZ * dir.z;
                            
                            if (dotForward > 0.3) {
                                blockScore += (avoidanceRadius - dist) / avoidanceRadius;
                                if (dist < 2.0) {
                                    this._isBlockedByAlly = true; // Bloqueado diretamente
                                }
                                
                                // O aliado está na nossa frente! Aplica força lateral de desvio
                                const latX = -dir.z;
                                const latZ = dir.x;
                                const dotLateral = relX * latX + relZ * latZ;
                                
                                // Desvia para o lado oposto ao que o aliado está posicionado lateralmente
                                let steerSign = dotLateral > 0 ? -1 : 1;
                                if (Math.abs(dotLateral) < 0.1) {
                                    steerSign = (this.uid % 2 === 0) ? -1 : 1;
                                }
                                
                                const force = ((avoidanceRadius - dist) / avoidanceRadius) * 4.0;
                                repelX += latX * steerSign * force;
                                repelZ += latZ * steerSign * force;
                                
                                // Empurrão radial se estiver extremamente perto para garantir separação física leve
                                if (dist < 1.8) {
                                    repelX += (dx / dist) * force * 0.5;
                                    repelZ += (dz / dist) * force * 0.5;
                                }
                            }
                        }
                    }
                    if (window.CombatProfiler) window.CombatProfiler.end('qualquer loop sobre aliados');
                }
            }
            if (blockScore > 1.2) {
                this._isBlockedByAlly = true;
            }
        }

        if (window.PerformanceProfiler) window.PerformanceProfiler.end('desvio_aliados');

        // Se houver alguma força de repulsão, combina com a direção de caminhada
        if (repelX !== 0 || repelZ !== 0) {
            _tmpVec3C.set(dir.x + repelX, 0, dir.z + repelZ);
            if (_tmpVec3C.lengthSq() > 0.001) {
                return _tmpVec3C.normalize();
            }
        }

        return dir;
    }

    applyKnockback(direction, force, duration, launchY = 0) {
        if (window.CombatProfiler) window.CombatProfiler.start('knockback');
        this.knockback.copy(direction).normalize().multiplyScalar(force);
        this.knockbackTimer = duration;
        this.stateDirty = true; // --- EVENTO: sofreu knockback ---
        if (launchY > 0) {
            this.launchVY = launchY;
            this.launchKills = true;
            // Velocidades angulares aleatórias para girar no ar
            this.tumbleX = (Math.random() - 0.5) * 18;
            this.tumbleY = (Math.random() - 0.5) * 12;
            this.tumbleZ = (Math.random() - 0.5) * 18;
        }
        if (window.CombatProfiler) window.CombatProfiler.end('knockback');
    }

    smoothTurn(targetAngle, delta, simSpeed) {
        let diff = targetAngle - this.rotY;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.rotY += diff * Math.min(delta * 12.0 * simSpeed, 1.0);
    }

    updateLOD(cameraPos, maxDistSq, medDistSq) {
        if (this.visibleSubMeshes !== undefined && (simulationFrame + this.uid) % 15 !== 0) return;

        const dx = this.x - cameraPos.x;
        const dy = this.y - cameraPos.y;
        const dz = this.z - cameraPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        let newLodLevel = 0;
        if (lodEnabled && radius > 250) {
            newLodLevel = 2;
        } else if (lodEnabled && distSq > medDistSq) {
            newLodLevel = 1;
        } else {
            newLodLevel = 0;
        }

        if (this.lodLevel !== newLodLevel || this.visibleSubMeshes === undefined) {
            this.lodLevel = newLodLevel;
            this.visibleSubMeshes = null; // Reset cache so instanced renderer updates immediately

            if (this.lodLevel === 2) {
                if (this.lodPrimitive && !this.lodPrimitive.visible) this.lodPrimitive.visible = true;
                if (this.head && this.head.visible) this.head.visible = false;
                if (this.torso && this.torso.visible) this.torso.visible = false;
                if (this.armL && this.armL.visible) this.armL.visible = false;
                if (this.armR && this.armR.visible) this.armR.visible = false;
                if (this.legL && this.legL.visible) this.legL.visible = false;
                if (this.legR && this.legR.visible) this.legR.visible = false;
                if (this.weapon && this.weapon.visible) this.weapon.visible = false;
                if (this.shield && this.shield.visible) this.shield.visible = false;
                if (this.quiver && this.quiver.visible) this.quiver.visible = false;
                if (this.bow && this.bow.visible) this.bow.visible = false;
                if (this.napoleonicGltf && this.napoleonicGltf.visible) this.napoleonicGltf.visible = false;
            } else if (this.lodLevel === 1) {
                if (this.lodPrimitive && this.lodPrimitive.visible) this.lodPrimitive.visible = false;
                if (this.head && !this.head.visible) this.head.visible = true;
                if (this.torso && !this.torso.visible) this.torso.visible = true;
                if (this.weapon && !this.weapon.visible) this.weapon.visible = true;
                if (this.shield && !this.shield.visible) this.shield.visible = true;
                if (this.quiver && !this.quiver.visible) this.quiver.visible = true;
                if (this.bow && !this.bow.visible) this.bow.visible = true;
                if (this.armL && this.armL.visible) this.armL.visible = false;
                if (this.armR && this.armR.visible) this.armR.visible = false;
                if (this.legL && this.legL.visible) this.legL.visible = false;
                if (this.legR && this.legR.visible) this.legR.visible = false;
                if (this.napoleonicGltf && !this.napoleonicGltf.visible) this.napoleonicGltf.visible = true;
            } else {
                if (this.lodPrimitive && this.lodPrimitive.visible) this.lodPrimitive.visible = false;
                if (this.head && !this.head.visible) this.head.visible = true;
                if (this.torso && !this.torso.visible) this.torso.visible = true;
                if (this.weapon && !this.weapon.visible) this.weapon.visible = true;
                if (this.shield && !this.shield.visible) this.shield.visible = true;
                if (this.quiver && !this.quiver.visible) this.quiver.visible = true;
                if (this.bow && !this.bow.visible) this.bow.visible = true;
                if (this.armL && !this.armL.visible) this.armL.visible = true;
                if (this.armR && !this.armR.visible) this.armR.visible = true;
                if (this.legL && !this.legL.visible) this.legL.visible = true;
                if (this.legR && !this.legR.visible) this.legR.visible = true;
                if (this.napoleonicGltf && !this.napoleonicGltf.visible) this.napoleonicGltf.visible = true;
            }
        }
    }

    cacheDummyParts() {
        if (this._partsCached) return;
        const dummy = this.dummy;
        if (!dummy) return;
        this._cachedLodPrimitive = dummy.getObjectByName("lodPrimitive");
        this._cachedTorso = dummy.getObjectByName("torso");
        this._cachedArmL = dummy.getObjectByName("armL");
        this._cachedArmR = dummy.getObjectByName("armR");
        this._cachedLegL = dummy.getObjectByName("legL");
        this._cachedLegR = dummy.getObjectByName("legR");
        this._cachedNapoleonicGltf = dummy.getObjectByName("napoleonic_gltf") || dummy.getObjectByName("Soldado");
        this._cachedBowGroup = dummy.getObjectByName("bowGroup");
        this._cachedBowString = dummy.getObjectByName("bowString");
        this._cachedTorchGroup = dummy.getObjectByName("torchGroup");
        this._partsCached = true;
    }

    updateDirtyFlags() {
        // 1. Position
        const posChanged = (this.x !== this._lastX || this.y !== this._lastY || this.z !== this._lastZ);
        if (posChanged) {
            this.positionDirty = true;
            this._lastX = this.x;
            this._lastY = this.y;
            this._lastZ = this.z;
        }

        // 2. Rotation
        const rX = this.rotX || 0;
        const rY = this.rotY || 0;
        const rZ = this.rotZ || 0;
        const rotChanged = (rX !== this._lastRotX || rY !== this._lastRotY || rZ !== this._lastRotZ);
        if (rotChanged) {
            this.rotationDirty = true;
            this._lastRotX = rX;
            this._lastRotY = rY;
            this._lastRotZ = rZ;
        }

        // 3. Visibility
        const visChanged = (this.visible !== this._lastVisible);
        if (visChanged) {
            this.visibilityDirty = true;
            this._lastVisible = this.visible;
        }

        // 4. Color
        const isFlashed = this.flashTimer > 0;
        let colorChanged = (isFlashed !== this._lastFlashed);
        if (!colorChanged && this.baseColor) {
            if (!this._lastBaseColor || !this.baseColor.equals(this._lastBaseColor)) {
                colorChanged = true;
            }
        } else if (!colorChanged && !this.baseColor && this._lastBaseColor) {
            colorChanged = true;
        }
        if (colorChanged) {
            this.colorDirty = true;
            this._lastFlashed = isFlashed;
            if (this.baseColor) {
                if (!this._lastBaseColor) this._lastBaseColor = new THREE.Color();
                this._lastBaseColor.copy(this.baseColor);
            } else {
                this._lastBaseColor = null;
            }
        }

        // 5. LOD
        const lodChanged = (this.lodLevel !== this._lastLodLevel);
        if (lodChanged) {
            this.lodDirty = true;
            this._lastLodLevel = this.lodLevel;
        }

        // 6. Scale (Safe backup)
        const scaleVal = this.scale || 1.0;
        let scaleChanged = false;
        if (scaleVal !== this._lastScale) {
            scaleChanged = true;
            this._lastScale = scaleVal;
        }

        // 7. Matrix
        const isMoving = this.lastVelocity && this.lastVelocity.lengthSq() > 0.0001;
        this._lastAnimTime = this.animTime;

        if (this.positionDirty || this.rotationDirty || this.lodDirty) {
            this.matrixDirty = true;
        }
    }

    updateFormation(baseX, baseZ) {
        // Implementação vazia ou lógica de formação aqui
    }

    setTarget(newTarget) {
        if (this.target === newTarget) return;
        if (this.target && this.target.attackers) {
            this.target.attackers.delete(this);
        }
        this.target = newTarget;
        if (this.target && this.target.attackers) {
            this.target.attackers.add(this);
        }
    }

    update(opponents, delta, simSpeed) {
        if (window.PerformanceProfiler) window.PerformanceProfiler.start('ia_guerreiros');
        if (this.isDead) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('ia_guerreiros');
            return;
        }

        if (window.CombatProfiler) window.CombatProfiler.start('atualização do estado');

        const prevX = this.x;
        const prevZ = this.z;

        if (this._terrainSpeed === undefined) {
            this._terrainSpeed = 1.0;
            this._inMud = false;
            this._atWaterEdge = false;
        }

        if ((simulationFrame + this.uid) % 12 === 0) {
            let terrainSpeed = 1.0;
            let inMud = false;
            for (let i = 0; i < muds.length; i++) {
                const dx = prevX - muds[i].x;
                const dz = prevZ - muds[i].z;
                if (dx * dx + dz * dz < muds[i].r * muds[i].r) {
                    terrainSpeed = 0.4;
                    inMud = true;
                    break;
                }
            }
            this._terrainSpeed = terrainSpeed;
            this._inMud = inMud;

            let atWaterEdge = false;
            for (let i = 0; i < lakes.length; i++) {
                const dx = prevX - lakes[i].x;
                const dz = prevZ - lakes[i].z;
                const distSq = dx * dx + dz * dz;
                const r = lakes[i].r;
                if (distSq < (r + 1) * (r + 1) && distSq > (r - 2) * (r - 2)) {
                    atWaterEdge = true;
                    break;
                }
            }
            this._atWaterEdge = atWaterEdge;
        }

        const terrainSpeed = this._terrainSpeed;
        const inMud = this._inMud;
        const atWaterEdge = this._atWaterEdge;

        if (atWaterEdge && this.lastVelocity.lengthSq() > 0.0001 && Math.random() < 0.1 * delta * 60) {
            createWaterSplash(this);
        }

        this.animTime += delta * 15 * simSpeed * terrainSpeed;

        if (this.attackCooldown > 0) {
            if (window.CombatProfiler) window.CombatProfiler.start('cooldown');
            this.attackCooldown -= delta * simSpeed;
            if (this.attackCooldown <= 0) {
                this.attackCooldown = 0;
                this.stateDirty = true; // Trigger heavy AI to attack again!
            }
            if (window.CombatProfiler) window.CombatProfiler.end('cooldown');
        }

        if (this.stuckDuration > 0) {
            this.stuckDuration -= delta * simSpeed;
        }

        this.updateFlash(delta);

        if (this.isAttacking) {
            const isShooter = (this.role === 'archer' || isNapoleonicTheme()) && !this.isDaggerArcher;
            if (isShooter) {
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('arqueiros');
                this.updateAttackLogic(delta, simSpeed);
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('arqueiros');
            } else {
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('combate_corpo_corpo');
                this.updateAttackLogic(delta, simSpeed);
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('combate_corpo_corpo');
            }
        }

        if (this.morale <= 20 && !this.isFleeing && !this.isPusher) {
            this.isFleeing = true;
            this.hasRetreated50m = false;
            this.fleeStartX = this.x;
            this.fleeStartZ = this.z;
            this.isAttacking = false;
            this.setTarget(null);
        }

        if (this.isFleeing) {
            if (!this.hasRetreated50m) {
                const dx = this.x - this.fleeStartX;
                const dz = this.z - this.fleeStartZ;
                let hitWall = false;
                if (window.CONFIG) {
                    const limitX = (CONFIG.arenaWidth || 1000) / 2 - 2;
                    const limitZ = (CONFIG.arenaDepth || 1000) / 2 - 2;
                    if (this.x <= -limitX || this.x >= limitX || this.z <= -limitZ || this.z >= limitZ) {
                        hitWall = true;
                    }
                }

                if (dx * dx + dz * dz >= 625 || hitWall) { // 25 metros ou limite do mapa
                    this.hasRetreated50m = true;
                    this.fleeTimer = 0;
                    this.lastVelocity.set(0, 0, 0);
                    this.isTryingToMove = false;
                } else {
                    const dirX = window.armies[this.faction].dirX;
                    let moveDir = _tmpVec3D.set(dirX, 0, 0);
                    moveDir = this.getAvoidanceDir(moveDir);
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('movimento');
                    this.lastVelocity.copy(moveDir).multiplyScalar(this.speed * 1.3);
                    this.lastTargetAngle = Math.atan2(moveDir.x, moveDir.z);
                    this.isTryingToMove = true;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('movimento');
                }
            } else {
                this.lastVelocity.set(0, 0, 0);
                this.isTryingToMove = false;
                this.fleeTimer += delta * simSpeed;
                // Rally back into battle faster instead of standing paralyzed for 200 seconds!
                if (this.fleeTimer >= 2.0) {
                    this.morale = 60;
                    this.isFleeing = false;
                    this.fleeTimer = 0;
                    this.stateDirty = true;
                }
            }
        } else {
            // --- TIME SLICING: IA pesada, desvios e colisões contra troncos/árvores divididos em grupos rotativos ---
            // LOD 2 (invisíveis) recebem IA a cada 9 frames; LOD 0-1 a cada 3 frames
            const sliceMod = this.lodLevel >= 2 ? 9 : 3;
            const isHeavyFrame = ((simulationFrame + this.uid) % sliceMod === 0);
            if (isHeavyFrame) {
                this.updateHeavyAIAndPhysics(opponents, delta, simSpeed);
            }
        }

        // Lógica de fadiga
        if (this.isTryingToMove || this.isAttacking) {
            this.fatigue = Math.max(0, this.fatigue - delta * simSpeed * 0.5);
        } else {
            this.fatigue = Math.min(100, this.fatigue + delta * simSpeed * 1.5);
        }

        // --- APLICAÇÃO DO MOVIMENTO ---
        if (window.PerformanceProfiler) window.PerformanceProfiler.start('movimento');
        if (this.knockbackTimer > 0) {
            if (window.CombatProfiler) window.CombatProfiler.start('knockback');
            this.x += this.knockback.x * delta * simSpeed; this.y += this.knockback.y * delta * simSpeed; this.z += this.knockback.z * delta * simSpeed;
            this.knockback.multiplyScalar(Math.pow(0.85, delta * 60));
            this.knockbackTimer -= delta * simSpeed;
            if (this.lodLevel === 0) {
                
            }
            if (window.CombatProfiler) window.CombatProfiler.end('knockback');
        } else {
            const fatigueSpeedMultiplier = this.fatigue > 30 ? 1.0 : (this.fatigue > 0 ? 0.7 : 0.4);
            this.x += this.lastVelocity.x * delta * simSpeed * terrainSpeed * fatigueSpeedMultiplier;
            this.z += this.lastVelocity.z * delta * simSpeed * terrainSpeed * fatigueSpeedMultiplier;

            if (this.lastVelocity.lengthSq() > 0.0001) {
                if (this.lodLevel === 0) {
                    
                }
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('steering');
                this.smoothTurn(this.lastTargetAngle, delta, simSpeed);
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('steering');
            } else {
                if (this.isAttacking) {
                    this.smoothTurn(this.lastTargetAngle, delta, simSpeed * 1.5);
                }
                if (!this.isAttacking && this.lodLevel === 0) {
                    
                }
            }
        }
        if (window.PerformanceProfiler) window.PerformanceProfiler.end('movimento');

        // Ajuste de altura no terreno e limite de arena
        if (this.lastVelocity.lengthSq() > 0.0001 || this.knockbackTimer > 0 || this.launchVY !== 0) {
            const heightFreq = this.lodLevel >= 2 ? 15 : 3;
            if ((simulationFrame + this.uid) % heightFreq === 0 || this.launchVY !== 0) {
                this.terrainY = getTerrainHeight(this.x, this.z);
            }
        }
        const baseHeight = inMud ? 0.8 : 1.5;
        if (this.launchVY !== 0 || this.y > this.terrainY + baseHeight + 0.05) {
            // Guerreiro no ar: aplica gravidade e gira
            this.launchVY -= 9.8 * delta * simSpeed;
            this.y += this.launchVY * delta * simSpeed;
            this.rotX += this.tumbleX * delta * simSpeed;
            this.rotY += this.tumbleY * delta * simSpeed;
            this.rotZ += this.tumbleZ * delta * simSpeed;
            if (this.y <= this.terrainY + baseHeight) {
                this.y = this.terrainY + baseHeight;
                this.launchVY = 0;
                this.tumbleX = 0; this.tumbleY = 0; this.tumbleZ = 0;
                this.rotX = 0; this.rotZ = 0;
                if (this.launchKills) {
                    this.launchKills = false;
                    this.takeDamage(9999, null);
                    if (window.CombatProfiler) window.CombatProfiler.end('atualização do estado');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('ia_guerreiros');
                    return;
                }
            }
        } else {
            this.y = this.terrainY + baseHeight;
        }
        this.keepInsideArena();

        // Lógica de stuck (travado)
        if (this.isTryingToMove) {
            const dx = this.x - prevX;
            const dz = this.z - prevZ;
            const distMovedSq = dx * dx + dz * dz;

            const expectedDist = this.speed * delta * simSpeed;
            const thresholdSq = (expectedDist * 0.1) * (expectedDist * 0.1);

            if (distMovedSq < thresholdSq || distMovedSq < 0.0001) {
                this.stuckTimer += delta * simSpeed;
                if (this.stuckTimer >= 1.5) { // percebe que travou mais rapido
                    this.stuckDuration = 2.5; // contorna por mais tempo
                    this.stuckAngleOffset = (Math.random() > 0.5) ? Math.PI / 2 : -Math.PI / 2;
                    this.stuckTimer = 0;
                }
            } else {
                this.stuckTimer = Math.max(0, this.stuckTimer - delta * simSpeed * 2);
            }
        } else {
            this.stuckTimer = 0;
        }
        if (window.CombatProfiler) window.CombatProfiler.end('atualização do estado');
        if (window.PerformanceProfiler) window.PerformanceProfiler.end('ia_guerreiros');
    }

    updateHeavyAIAndPhysics(opponents, delta, simSpeed) {
        let allOpponentsDead = (opponents.length === 0);

        if (allOpponentsDead) {
            this.setTarget(null);
            this.lastVelocity.set(0, 0, 0);
            this.isTryingToMove = false;
            this.isAttacking = false;
            this.currentState = 'WAITING';
            this.stateDirty = false;
            return;
        }

        // --- SISTEMA DE TELEMETRIA / CONTABILIZAÇÃO DE CHAMADAS ---
        if (!window.stateMetrics) {
            window.stateMetrics = { callsBefore: 0, callsAfter: 0 };
        }
        window.stateMetrics.callsBefore++;

        // --- STATE DIRTY FLAG OPTIMIZATION CHECK ---
        // Se o estado não foi marcado como "dirty", podemos usar a lógica leve em vez da busca pesada e desvios complexos!
        if (!this.stateDirty) {
            this.runLightweightStateBypass(opponents, delta, simSpeed);
            return;
        }

        window.stateMetrics.callsAfter++;

        this.stateDirty = false; // reseta a flag de dirty

        // --- ARVORE DE COMPORTAMENTO (BEHAVIOR TREE) ---
        // Seletor Root: Executa sequências de comportamento de acordo com a prioridade das ações.
        // Isso organiza as decisões de forma modular, modularizando os ramos do cérebro do guerreiro.
        if (this.evaluatePusherBehavior(opponents, delta, simSpeed)) return;
        if (this.evaluateCombatBehavior(opponents, delta, simSpeed)) return;

        // Fallback: Se nenhuma ramificação for selecionada, garanta inércia
        this.lastVelocity.set(0, 0, 0);
        this.isTryingToMove = false;
        this.currentState = 'WAITING';
    }

    runLightweightStateBypass(opponents, delta, simSpeed) {
        if (this.isDead) {
            this.currentState = 'DEAD';
            this.stateDirty = false;
            return;
        }

        // pushers continuam no modo especial para acompanhar catapulta
        if (this.isPusher && this.catapult && !this.catapult.isDead) {
            if (this.aiTick % 12 === 0) {
                this.stateDirty = true;
            }
            return;
        }

        // WAITING state periodically checks if it should re-evaluate blocked status
        if (this.currentState === 'WAITING') {
            const waitingCheckFreq = this.lodLevel >= 2 ? 48 : 12; // ~200-300ms
            if (this.aiTick % waitingCheckFreq === 0) {
                this.stateDirty = true;
            }
            this.lastVelocity.set(0, 0, 0);
            this.isTryingToMove = false;
            return;
        }

        // Sem alvo válido: ADVANCING ou FLANKING
        if (!this.target || this.target.isDead) {
            this.setTarget(null);
            this.isAttacking = false;

            // Busca novo alvo a cada freq reduzida se estiver avançando/flanqueando
            const targetSearchFreq = this.lodLevel >= 2 ? 48 : 12;
            if (this.aiTick % targetSearchFreq === 0) {
                this.stateDirty = true;
                return;
            }

            if (this.formationTarget) {
                this.currentState = 'ADVANCING';
                const dx = this.formationTarget.x - this.x;
                const dz = this.formationTarget.z - this.z;
                const distSq = dx * dx + dz * dz;
                
                if (distSq > 1.0) {
                    let moveDir = _tmpVec3A.set(dx, 0, dz).normalize();
                    const moveSpeed = this.speed * (this.fatigue > 30 ? 1.0 : (this.fatigue > 0 ? 0.7 : 0.4));
                    this.lastVelocity.set(moveDir.x * moveSpeed, 0, moveDir.z * moveSpeed);
                    this.lastTargetAngle = Math.atan2(dx, dz) + Math.PI;
                    this.isTryingToMove = true;
                } else {
                    this.lastVelocity.set(0, 0, 0);
                    this.isTryingToMove = false;
                    if (this.formationTarget.rotY !== undefined) {
                        this.lastTargetAngle = this.formationTarget.rotY;
                    }
                }
            } else if (this.isFlanker) {
                this.currentState = 'FLANKING';
                const dirX = window.armies[this.faction].dirX;
                const flankDirZ = (this.uid % 2 === 0) ? 1.0 : -1.0;
                this.lastVelocity.set(dirX * this.speed * 0.7, 0, flankDirZ * this.speed * 0.7);
                this.lastTargetAngle = Math.atan2(this.lastVelocity.x, this.lastVelocity.z);
                this.isTryingToMove = true;
            } else {
                this.currentState = 'ADVANCING';
                const dirX = window.armies[this.faction].dirX;
                this.lastVelocity.set(dirX * this.speed, 0, 0);
                this.lastTargetAngle = Math.atan2(dirX, 0) + Math.PI;
                this.isTryingToMove = true;
            }
            return;
        }

        // Temos alvo vivo e válido!
        // Checagem de proximidade imediata: se houver um inimigo MUITO MAIS PRÓXIMO na frente (< 6m) do que o nosso alvo atual (> 10m), troca para ele imediatamente!
        if (window.findNearestEnemyInGrid && (this.role === 'melee' || this.isDaggerArcher)) {
            const closeEnemy = window.findNearestEnemyInGrid(this);
            if (closeEnemy && closeEnemy !== this.target) {
                const cdx = getTargetX(closeEnemy) - this.x;
                const cdz = getTargetZ(closeEnemy) - this.z;
                const cDistSq = cdx * cdx + cdz * cdz;
                const curDx = getTargetX(this.target) - this.x;
                const curDz = getTargetZ(this.target) - this.z;
                const curDistSq = curDx * curDx + curDz * curDz;
                if (cDistSq < 36 && curDistSq > 100) { // Inimigo próximo a <6m e alvo atual a >10m
                    this.setTarget(closeEnemy);
                    this.stateDirty = true;
                    return;
                }
            }
        }

        const dx = getTargetX(this.target) - this.x;
        const dz = getTargetZ(this.target) - this.z;
        const distSq = dx * dx + dz * dz;

        const targetRadius = this.target.radius || 0.8;
        const isMeleeCombatant = (this.role === 'melee' || this.isDaggerArcher);
        
        let actualAttackRange = isMeleeCombatant ? (this.attackRange - 0.8 + targetRadius) : this.attackRange;
        
        this.isSupporting = false;
        if (isMeleeCombatant && this.target && this.target.attackers) {
            let rank = 0;
            let found = false;
            for (let a of this.target.attackers) {
                if (a === this) { found = true; break; }
                if (!a.isDead && (a.role === 'melee' || a.isDaggerArcher)) rank++;
            }
            if (found && rank >= 3) {
                this.isSupporting = true;
                actualAttackRange = 7.0;
            }
        }
        
        const actualAttackRangeSq = actualAttackRange * actualAttackRange;

        // Reprocessamento preventivo ocasional de desvios e rotas
        const reevaluateFreq = this.lodLevel >= 2 ? 48 : 24;
        if (this.aiTick % reevaluateFreq === 0) {
            this.stateDirty = true;
            return;
        }

        if (isMeleeCombatant) {
            if (distSq > actualAttackRangeSq) {
                // --- EVENTO: Alvo saiu do alcance ---
                if (this.currentState === 'FIGHTING') {
                    this.stateDirty = true;
                    return;
                }
                this.currentState = 'MOVING';
                // Cálculo de velocidade direto super leve, sem os custos do desvio de obstáculos contínuo!
                let dir = _tmpVec3A.set(dx, 0, dz).normalize();
                this.lastVelocity.set(dir.x * this.speed, 0, dir.z * this.speed);
                this.lastTargetAngle = Math.atan2(dx, dz) + Math.PI;
                this.isTryingToMove = true;
            } else {
                // --- EVENTO: Chegou ao destino ---
                if (this.currentState !== 'FIGHTING') {
                    this.stateDirty = true;
                    return;
                }
                this.lastVelocity.set(0, 0, 0);
                this.isTryingToMove = false;
            }
        } else {
            // Atiradores/Arqueiros
            const keepDistSq = this.keepDistanceRange * this.keepDistanceRange;
            if (distSq < keepDistSq) {
                if (this.currentState === 'FIGHTING') {
                    this.stateDirty = true;
                    return;
                }
                this.currentState = 'MOVING';
                let dir = _tmpVec3A.set(-dx, 0, -dz).normalize();
                this.lastVelocity.set(dir.x * this.speed * 0.7, 0, dir.z * this.speed * 0.7);
                this.lastTargetAngle = Math.atan2(-dx, -dz) + Math.PI;
                this.isTryingToMove = true;
            } else if (distSq > actualAttackRangeSq) {
                if (this.currentState === 'FIGHTING') {
                    this.stateDirty = true;
                    return;
                }
                this.currentState = 'MOVING';
                let dir = _tmpVec3A.set(dx, 0, dz).normalize();
                this.lastVelocity.set(dir.x * this.speed, 0, dir.z * this.speed);
                this.lastTargetAngle = Math.atan2(dx, dz) + Math.PI;
                this.isTryingToMove = true;
            } else {
                if (this.currentState !== 'FIGHTING') {
                    this.stateDirty = true;
                    return;
                }
                this.lastVelocity.set(0, 0, 0);
                this.isTryingToMove = false;
            }
        }
    }

    // --- ARVORE DE COMPORTAMENTO: COMPORTAMENTO DE EMPURRADOR DE CATAPULTA (SEQUÊNCIA/SELETOR) ---
    evaluatePusherBehavior(opponents, delta, simSpeed) {
        if (!this.isPusher || !this.catapult || this.catapult.isDead) return false;

        const cat = this.catapult;
        // Se a catapulta está se movendo, o pusher apenas acompanha o movimento fisicamente
        const hasTarget = cat.hasEnemyInStopRange ? cat.hasEnemyInStopRange(opponents) : cat.hasEnemyInRange(opponents);
        const hasPusherAlive = cat.pushers.some(p => !p.isDead);
        const catIsMoving = !hasTarget && hasPusherAlive;

        if (catIsMoving) {
            resolveLogCollisions(this);
            this.isTryingToMove = true;
            return true; // Sucesso (Nó executado com prioridade)
        }

        // Defende a catapulta se ela não estiver se movendo e houver inimigos extremamente próximos dela
        let nearestEnemy = null;
        let minDistSq = 18 * 18;
        const cx = cat.mesh.position.x;
        const cz = cat.mesh.position.z;

        if (window.CombatProfiler) window.CombatProfiler.start('qualquer loop sobre inimigos');
        for (let i = 0; i < opponents.length; i++) {
            const e = opponents[i];
            if (e.isDead) continue;
            if (window.CombatProfiler) window.CombatProfiler.start('cálculo de distância');
            const dx = e.x - cx;
            const dz = e.z - cz;
            const distSq = dx * dx + dz * dz;
            if (window.CombatProfiler) window.CombatProfiler.end('cálculo de distância');
            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearestEnemy = e;
            }
        }
        if (window.CombatProfiler) window.CombatProfiler.end('qualquer loop sobre inimigos');

        if (nearestEnemy) {
            this.setTarget(nearestEnemy);
            return false; // Continua para o comportamento normal de combate utilizando o novo alvo
        } else {
            // Se não houver perigos próximos, retorna/mantém-se na posição de empurrar
            const dir = window.armies[this.faction].catapultDir;
            const offsetZ = (this.uid % 2 === 0) ? -1.2 : 1.2;
            const tx = cx - dir * 3.4;
            const tz = cz + offsetZ;

            if (window.CombatProfiler) window.CombatProfiler.start('cálculo de distância');
            const dx = tx - this.x;
            const dz = tz - this.z;
            const distSq = dx * dx + dz * dz;
            if (window.CombatProfiler) window.CombatProfiler.end('cálculo de distância');
            if (distSq > 0.5) {
                this.setTarget(null);
                this.lastVelocity.set(dx, 0, dz).normalize().multiplyScalar(this.speed);
                this.lastTargetAngle = Math.atan2(dx, dz) + Math.PI;
                this.isTryingToMove = true;
            } else {
                this.lastVelocity.set(0, 0, 0);
                this.setTarget(null);
                this.isTryingToMove = false;
            }
            resolveLogCollisions(this);
            return true; // Sucesso
        }
    }

    // --- ARVORE DE COMPORTAMENTO: COMPORTAMENTO DE COMBATE E SEGMENTAÇÃO DE ALVOS (SELETOR) ---
    evaluateCombatBehavior(opponents, delta, simSpeed) {
        this.updateAI(opponents);

        this.isTryingToMove = false;
        this.isKiting = false;

        // Verifica se o alvo é válido e está vivo
        if (window.CombatProfiler) window.CombatProfiler.start('validação do alvo atual');
        const hasValidTarget = (this.target && !this.target.isDead);
        if (window.CombatProfiler) window.CombatProfiler.end('validação do alvo atual');

        if (hasValidTarget) {
            if (window.CombatProfiler) window.CombatProfiler.start('cálculo de distância');
            const dx = getTargetX(this.target) - this.x;
            const dz = getTargetZ(this.target) - this.z;
            const distSq = dx * dx + dz * dz;
            if (window.CombatProfiler) window.CombatProfiler.end('cálculo de distância');

            this.lastTargetAngle = Math.atan2(dx, dz) + Math.PI;

            const targetRadius = this.target.radius || 0.8;
            const isMeleeCombatant = (this.role === 'melee' || this.isDaggerArcher);
            const actualAttackRange = isMeleeCombatant ? (this.attackRange - 0.8 + targetRadius) : this.attackRange;
            const actualAttackRangeSq = actualAttackRange * actualAttackRange;

            if (isMeleeCombatant) {
                if (distSq > actualAttackRangeSq) {
                    this.currentState = 'MOVING';
                    this.moveTowardsTarget(delta, simSpeed);
                } else {
                    this.currentState = 'FIGHTING';
                    this.lastVelocity.set(0, 0, 0);
                    this.stopAndAttack(simSpeed);
                }
            } else {
                // Comportamento de Atirador (Arqueiro / Mosqueteiro)
                if (window.CombatProfiler) window.CombatProfiler.start('cálculo de distância');
                const keepDistSq = this.keepDistanceRange * this.keepDistanceRange;
                if (window.CombatProfiler) window.CombatProfiler.end('cálculo de distância');

                if (distSq < keepDistSq) {
                    this.currentState = 'MOVING';
                    this.kiteTarget(delta, simSpeed);
                    this.isKiting = true;
                } else if (distSq > actualAttackRangeSq) {
                    this.currentState = 'MOVING';
                    this.moveTowardsTarget(delta, simSpeed);
                } else {
                    this.currentState = 'FIGHTING';
                    this.lastVelocity.set(0, 0, 0);
                    this.stopAndAttack(simSpeed);
                }
            }
        } else {
            // Se o alvo morreu ou se não tem alvo, avance na direção inimiga base da facção
            this.setTarget(null);
            this.isAttacking = false;
            if (this.formationTarget) {
                this.currentState = 'ADVANCING';
                const dx = this.formationTarget.x - this.x;
                const dz = this.formationTarget.z - this.z;
                const distSq = dx * dx + dz * dz;
                
                if (distSq > 1.0) {
                    let moveDir = _tmpVec3A.set(dx, 0, dz).normalize();
                    const moveSpeed = this.speed * (this.fatigue > 30 ? 1.0 : (this.fatigue > 0 ? 0.7 : 0.4));
                    this.lastVelocity.set(moveDir.x * moveSpeed, 0, moveDir.z * moveSpeed);
                    this.lastTargetAngle = Math.atan2(dx, dz) + Math.PI;
                    this.isTryingToMove = true;
                } else {
                    this.lastVelocity.set(0, 0, 0);
                    this.isTryingToMove = false;
                    if (this.formationTarget.rotY !== undefined) {
                        this.lastTargetAngle = this.formationTarget.rotY;
                    }
                }
            } else if (this.isFlanker) {
                this.currentState = 'FLANKING';
                const dirX = window.armies[this.faction].dirX;
                const flankDirZ = (this.uid % 2 === 0) ? 1.0 : -1.0;
                this.lastVelocity.set(dirX * this.speed * 0.7, 0, flankDirZ * this.speed * 0.7);
                this.lastTargetAngle = Math.atan2(this.lastVelocity.x, this.lastVelocity.z);
                this.isTryingToMove = true;
            } else {
                this.currentState = 'ADVANCING';
                const dirX = window.armies[this.faction].dirX;
                this.lastVelocity.set(dirX * this.speed, 0, 0);
                this.lastTargetAngle = Math.atan2(dirX, 0) + Math.PI;
                this.isTryingToMove = true;
            }
        }

        resolveLogCollisions(this);
        return true;
    }

    updateAI(opponents) {
        if (!this.aiTick) this.aiTick = 0;
        this.aiTick++;
        
        if (window.CombatProfiler) window.CombatProfiler.start('validação do alvo atual');
        const hasTarget = (this.target && !this.target.isDead);
        if (window.CombatProfiler) window.CombatProfiler.end('validação do alvo atual');

        if ((this.role === 'melee' || this.isDaggerArcher) && hasTarget) {
            if (window.CombatProfiler) window.CombatProfiler.start('cálculo de distância');
            const dx = getTargetX(this.target) - this.x;
            const dz = getTargetZ(this.target) - this.z;
            const distSq = dx * dx + dz * dz;
            if (window.CombatProfiler) window.CombatProfiler.end('cálculo de distância');

            const targetRadius = this.target.radius || 0.8;
            const actualAttackRange = this.attackRange - 0.8 + targetRadius;
            if (distSq <= actualAttackRange * actualAttackRange) {
                // Já engajado em combate corpo a corpo com oponente vivo. Mantém foco para evitar custos de busca e manter as fileiras organizadas!
                return;
            }
        }
        
        const aiFreq = this.lodLevel >= 2 ? 24 : (this.lodLevel === 1 ? 12 : 6);
        if (this.aiTick % aiFreq !== 0 && hasTarget) return;

        const findFreq = this.lodLevel >= 2 ? 96 : (this.lodLevel === 1 ? 48 : 24);
        const needsSearch = (!this.target || this.target.isDead || this.aiTick % findFreq === 0);
        if (needsSearch) {
            if (window.CombatProfiler) window.CombatProfiler.start('procura de novo alvo');
            let bestTarget = null;

            if (window.CombatProfiler) window.CombatProfiler.start('busca de inimigo');
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('busca_inimigos');
            // 1. Tenta buscar inimigo vivo próximo usando o Grid Espacial (O(1))
            if (window.findNearestEnemyInGrid) {
                bestTarget = window.findNearestEnemyInGrid(this);
            }

            // 2. Se não encontrar nenhum inimigo próximo no Grid (armadas distantes no início),
            // escolhe o oponente vivo no MESMO CORREDOR (mesmo eixo Z) para marchar em linha reta paralela!
            if (!bestTarget && opponents.length > 0) {
                let minZDiff = Infinity;
                if (window.CombatProfiler) window.CombatProfiler.start('qualquer loop sobre inimigos');
                for (let i = 0; i < opponents.length; i++) {
                    const enemy = opponents[i];
                    if (enemy && !enemy.isDead) {
                        const zDiff = Math.abs(enemy.z - this.z);
                        if (zDiff < minZDiff) {
                            minZDiff = zDiff;
                            bestTarget = enemy;
                        }
                    }
                }
                if (window.CombatProfiler) window.CombatProfiler.end('qualquer loop sobre inimigos');
            }
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('busca_inimigos');
            if (window.CombatProfiler) window.CombatProfiler.end('busca de inimigo');

            if (window.PerformanceProfiler) window.PerformanceProfiler.start('selecao_alvo');
            // 3. Se houver catapultas inimigas e formos Flankers ou DaggerArchers (ou a cada tick longo de busca),
            // prioriza atacar a catapulta se ela estiver ao alcance visual ou estratégico (~40m).
            // A escolha usa penalidade por aglomeração para espalhar os atacantes entre as catapultas.
            const catapults = battleManager.getCatapults();
            if (catapults.length > 0) {
                const p1 = this;
                let bestCat = null;
                let bestCatScore = Infinity;
                if (window.CombatProfiler) window.CombatProfiler.start('qualquer loop sobre inimigos');
                for (let i = 0; i < catapults.length; i++) {
                    const cat = catapults[i];
                    if (cat.isDead || cat.faction === this.faction) continue;

                    const catPos = cat.mesh.position;
                    if (window.CombatProfiler) window.CombatProfiler.start('cálculo de distância');
                    const dx = p1.x - catPos.x;
                    const dz = p1.z - catPos.z;
                    const dSq = dx * dx + dz * dz;
                    if (window.CombatProfiler) window.CombatProfiler.end('cálculo de distância');

                    // Se a catapulta estiver próxima (~14m) ou se formos flanqueadores/dagger archers num raio de ~40m
                    if (dSq < 200 || (dSq < 1600 && (this.isFlanker || this.isDaggerArcher || this.aiTick % 96 === 0))) {
                        const catAtk = cat.attackers ? cat.attackers.size : 0;
                        const catScore = dSq * (1 + catAtk * 0.5);
                        if (catScore < bestCatScore) {
                            bestCatScore = catScore;
                            bestCat = cat;
                        }
                    }
                }
                if (window.CombatProfiler) window.CombatProfiler.end('qualquer loop sobre inimigos');
                if (bestCat) bestTarget = bestCat;
            }

            if (bestTarget) {
                if (this.target !== bestTarget) {
                    if (window.CombatProfiler) window.CombatProfiler.start('troca de alvo');
                    this.setTarget(bestTarget);
                    if (window.CombatProfiler) window.CombatProfiler.end('troca de alvo');
                } else {
                    this.setTarget(bestTarget);
                }
            }
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('selecao_alvo');
            if (window.CombatProfiler) window.CombatProfiler.end('procura de novo alvo');
        }
    }

    moveTowardsTarget(delta, simSpeed) {
        if (!this.target) {
            this.lastVelocity.set(0, 0, 0);
            return;
        }
        const tPos = getTargetPos(this.target, _tmpVec3B);
        let dir = _tmpVec3A.subVectors(tPos, this).normalize();

        const hash = this.uid;
        // Leve variação para não ficarem milimetricamente colados, mas sem espalhar na largada
        const sideAngle = (hash % 10 - 5) * 0.05;
        dir.applyAxisAngle(_axisY, sideAngle);

        dir = this.getAvoidanceDir(dir);
        
        if (this._isBlockedByAlly) {
            if (!this.isFlanker && this.role !== 'archer') {
                this.currentState = 'WAITING';
                this.lastVelocity.set(0, 0, 0);
                this.isTryingToMove = false;
                return;
            } else if (this.isFlanker) {
                this.currentState = 'FLANKING';
            }
        }

        this.lastVelocity.set(dir.x * this.speed, 0, dir.z * this.speed);
        this.isTryingToMove = true;
    }

    kiteTarget(delta, simSpeed) {
        if (!this.target) {
            this.lastVelocity.set(0, 0, 0);
            return;
        }
        const tPos = getTargetPos(this.target, _tmpVec3B);
        let dir = _tmpVec3A.subVectors(this, tPos).normalize();

        dir = this.getAvoidanceDir(dir);

        this.lastVelocity.set(dir.x * this.speed * 0.7, 0, dir.z * this.speed * 0.7);
        this.isTryingToMove = true;
    }

    keepInsideArena() {
        const limitX = sizeX / 2 - 2;
        const limitZ = sizeZ / 2 - 2;

        if (this.x < -limitX) this.x = -limitX;
        if (this.x > limitX) this.x = limitX;
        if (this.z < -limitZ) this.z = -limitZ;
        if (this.z > limitZ) this.z = limitZ;
    }

    stopAndAttack(simSpeed) {
        if (window.CombatProfiler) window.CombatProfiler.start('ataque');
        
        if (this.isSupporting) {
            if (this.target) {
                const tx = this.target.x !== undefined ? this.target.x : (this.target.mesh ? this.target.mesh.position.x : 0);
                const tz = this.target.z !== undefined ? this.target.z : (this.target.mesh ? this.target.mesh.position.z : 0);
                this.lastTargetAngle = Math.atan2(tx - this.x, tz - this.z) + Math.PI;
            }
            if (window.CombatProfiler) window.CombatProfiler.end('ataque');
            return;
        }
        
        const isShooter = (this.role === 'archer' || isNapoleonicTheme()) && !this.isDaggerArcher;
        if (!isShooter) {
            const isTargetCatapult = (this.target && this.target.isCatapult);
            if (isTargetCatapult) {
                if (this.attackCooldown <= 0 && !this.isAttacking) {
                    this.isAttacking = true;
                    this.attackAnimProgress = 0;
                }
            } else {
                if (this.attackCooldown <= 0 && !this.isAttacking && !this.target.isAttacking) {
                    const myRoll = Math.floor(Math.random() * 6) + 1;
                    const targetRoll = Math.floor(Math.random() * 6) + 1;

                    if (myRoll > targetRoll) {
                        this.isAttacking = true;
                        this.attackAnimProgress = 0;
                    } else if (targetRoll > myRoll) {
                        this.target.isAttacking = true;
                        this.target.attackAnimProgress = 0;
                        this.attackCooldown = 1.2;
                    } else {
                        _tmpVec3A.subVectors(this.target, this).normalize();
                        _tmpVec3B.copy(_tmpVec3A).negate();
                        this.applyKnockback(_tmpVec3B, 8.0, 0.3);
                        this.target.applyKnockback(_tmpVec3A, 8.0, 0.3);

                        this.target.attackCooldown = 0.5;
                        this.attackCooldown = 1.0;

                        createSparks(this.target);
                        playClangSound(0.2);
                    }
                }
            }
        } else {
            if (this.attackCooldown <= 0 && !this.isAttacking) {
                this.isAttacking = true;
                this.attackAnimProgress = 0;
                if (this.target) {
                    const tx = this.target.x !== undefined ? this.target.x : (this.target.mesh ? this.target.mesh.position.x : 0);
                    const tz = this.target.z !== undefined ? this.target.z : (this.target.mesh ? this.target.mesh.position.z : 0);
                    this.lastTargetAngle = Math.atan2(tx - this.x, tz - this.z) + Math.PI;
                }
            }
        }
        if (window.CombatProfiler) window.CombatProfiler.end('ataque');
    }


    takeDamage(amount, attacker) {
        if (window.CombatProfiler) window.CombatProfiler.start('aplicação de dano');
        this.hp -= amount;
        this.morale = Math.max(1, this.morale - 1);
        this.flashTimer = 0.12; // Inicia flash sem setTimeout

        createBlood(this);

        if (attacker && attacker.role === 'melee') {
            _tmpVec3A.subVectors(this, attacker).normalize();
            this.applyKnockback(_tmpVec3A, 4.5, 0.2);
        }

        if (this.hp <= 0 && !this.isDead) {
            this.die(attacker);
        }
        if (window.CombatProfiler) window.CombatProfiler.end('aplicação de dano');
    }

    updateFlash(delta) {
        if (this.flashTimer > 0) {
            this.flashTimer -= delta;
            if (this.flashTimer <= 0) {
                this.flashTimer = 0;
            }
        }
    }

    die(killer) {
        if (window.CombatProfiler) window.CombatProfiler.start('morte');
        this.isDead = true;
        this.currentState = 'DEAD';
        this.stateDirty = false;
        this.isAttacking = false;
        this.isTryingToMove = false;
        this.isKiting = false;
        this.setTarget(null);
        this.lastVelocity.set(0, 0, 0);

        playDeathSound();
        battleManager.setKills(battleManager.getKills() + 1);

        // Contadores do HUD são atualizados no máximo 1x por frame (flush no game-loop)
        window.hudCountersDirty = true;

        window.armies[this.faction].addDeadCount();

        // Remoção O(1) da lista do exército: swap-and-pop com índice rastreado.
        // Seguro porque todos os loops sobre as listas iteram de trás para frente.
        const list = window.armies[this.faction].list;
        const idx = this._armyIndex;
        if (idx >= 0 && idx < list.length && list[idx] === this) {
            const lastIdx = list.length - 1;
            if (idx !== lastIdx) {
                const moved = list[lastIdx];
                list[idx] = moved;
                moved._armyIndex = idx;
            }
            list.pop();
        } else {
            // Fallback de segurança caso o índice esteja dessincronizado
            const fallbackIdx = list.indexOf(this);
            if (fallbackIdx !== -1) list.splice(fallbackIdx, 1);
        }

        // Cap de cadáveres: recicla o mais antigo quando atinge o limite
        const deadList = battleManager.getDeadWarriors();
        const maxCorpses = (typeof CONFIG !== 'undefined' && CONFIG.MAX_CORPSES) || 1500;
        if (deadList.length >= maxCorpses) {
            const oldest = deadList[0];
            if (oldest.uniqueBodyMat) oldest.uniqueBodyMat.dispose();
            deadList[0] = deadList[deadList.length - 1];
            deadList.pop();
        }
        deadList.push(this);

        this.rotZ = Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
        this.y = getTerrainHeight(this.x, this.z) + 0.2;

        // --- EVENTO: Alvo morreu ---
        // Notifica apenas os inimigos que tinham este guerreiro como alvo (Set attackers) — O(atacantes)
        for (const attacker of this.attackers) {
            if (attacker.target === this) {
                attacker.target = null;
                attacker.stateDirty = true;
            }
        }
        this.attackers.clear();

        // --- EVENTO: Abriu espaço na formação ---
        // Notifica aliados num raio de 15m via spatial grid (3 células de 5m) — O(vizinhos)
        if (window.spatialGrid && window.GRID_COLS && window.GRID_CELL_SIZE) {
            const gridCols = window.GRID_COLS;
            const cellSize = window.GRID_CELL_SIZE;
            const halfX = (typeof sizeX !== 'undefined' ? sizeX : 1000) / 2 + 10;
            const halfZ = (typeof sizeZ !== 'undefined' ? sizeZ : 1000) / 2 + 10;

            const col = Math.max(0, Math.min(gridCols - 1, Math.floor((this.x + halfX) / cellSize)));
            const row = Math.max(0, Math.min(window.GRID_ROWS - 1, Math.floor((this.z + halfZ) / cellSize)));

            const cellRange = 3; // 15m / 5m por célula
            const minCol = Math.max(0, col - cellRange);
            const maxCol = Math.min(gridCols - 1, col + cellRange);
            const minRow = Math.max(0, row - cellRange);
            const maxRow = Math.min(window.GRID_ROWS - 1, row + cellRange);
            const moraleRadiusSq = 15 * 15;

            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    const cell = window.spatialGrid[c + r * gridCols];
                    if (!cell || cell.length === 0) continue;
                    for (let i = 0; i < cell.length; i++) {
                        const ally = cell[i];
                        if (ally === this || ally.isDead || ally.faction !== this.faction) continue;
                        const dx = ally.x - this.x;
                        const dz = ally.z - this.z;
                        if (dx * dx + dz * dz < moraleRadiusSq) { // raio de 15 metros
                            ally.stateDirty = true;
                            ally.morale = Math.max(1, ally.morale - 0.5); // Reduzido penalty de 2 para 0.5 para evitar flee instantaneo da linha de frente inteira
                        }
                    }
                }
            }
        }

        if (window.CombatProfiler) window.CombatProfiler.end('morte');
    }

    fadeAndSink(delta) {
        this.y -= delta * 0.3;
        if (this.y < -5) {
            if (this.uniqueBodyMat) {
                this.uniqueBodyMat.dispose();
            }
            return true;
        }
        return false;
    }


    updateAttackLogic(delta, simSpeed) {
        if (window.CombatProfiler) window.CombatProfiler.start('animação de ataque');
        if (!this.isAttacking) {
            if (window.CombatProfiler) window.CombatProfiler.end('animação de ataque');
            return;
        }
        const isShooter = (this.role === 'archer' || isNapoleonicTheme()) && !this.isDaggerArcher;
        const animSpeed = isShooter ? (isNapoleonicTheme() ? 0.85 : 6) : 12;
        this.attackAnimProgress += delta * animSpeed * simSpeed;

        if (this.attackAnimProgress >= 1.0) {
            this.isAttacking = false;
            this.attackCooldown = isShooter ? (isNapoleonicTheme() ? (9.0 + Math.random() * 2.0) : (1.8 + Math.random() * 0.6)) : (0.8 + Math.random() * 0.5);
            this.stateDirty = true; // --- EVENTO: terminou o ataque ---

            if (this.target && !this.target.isDead) {
                if (!isShooter) {
                    const isDagger = this.isDaggerArcher;
                    // Captura a referência: se o golpe matar, die() anula this.target do atacante
                    const victim = this.target;

                    // --- SISTEMA DE FORÇA: rolagem contestada Ataque × Defesa ---
                    let defended = false;
                    if (CONFIG.STRENGTH_SYSTEM_ENABLED) {
                        const rv = CONFIG.STRENGTH_ROLL_VARIANCE;
                        const atkRoll = this.attackStrength * (1 - rv + Math.random() * 2 * rv) * CONFIG.STRENGTH_HIT_BIAS;
                        const defRoll = (victim.defenseStrength || CONFIG.STRENGTH_BASELINE) * (1 - rv + Math.random() * 2 * rv);
                        defended = (atkRoll <= defRoll);
                    }

                    if (defended) {
                        // Golpe defendido: sem dano de HP, mas abala a moral do defensor
                        if (victim.morale !== undefined) victim.morale = Math.max(1, victim.morale - 0.5);
                        createSparks(victim);
                        playClangSound(0.3);
                    } else {
                        const dmg = isDagger ? (22 + Math.floor(Math.random() * 18)) : (15 + Math.floor(Math.random() * 15));
                        victim.takeDamage(dmg, this);
                        this.morale = Math.min(70, this.morale + 1);
                        createSparks(victim);
                        playClangSound(dmg / 30);
                    }
                } else {
                    // --- REGRAS DA SPEC (Real-Medieval-Battles.md) ---
                    if (CONFIG.ARCHER_RULES_ENABLED) {
                        // "Estou sem flechas? → Recuar": sem munição, vira lutador de adaga
                        if (this.ammo <= 0) {
                            this.isDaggerArcher = true;
                            this.attackRange = 2.8;
                            this.attackCooldown = 0.3 + Math.random() * 0.3;
                            this.stateDirty = true;
                            window.archerDaggerConversions = (window.archerDaggerConversions || 0) + 1;
                            if (window.CombatProfiler) window.CombatProfiler.end('animação de ataque');
                            return;
                        }
                        // "Existe aliado entre mim e o alvo? → Não atirar":
                        // não dispara em alvo já engajado corpo a corpo por aliados (risco de fogo amigo)
                        let meleeEngaged = false;
                        if (this.target.attackers && this.target.attackers.size > 0) {
                            for (const a of this.target.attackers) {
                                if (!a.isDead && a !== this && !a.isPusher && (a.role === 'melee' || a.isDaggerArcher)) {
                                    meleeEngaged = true;
                                    break;
                                }
                            }
                        }
                        if (meleeEngaged) {
                            // Segura o tiro e força re-busca por alvo livre
                            this.attackCooldown = 0.5 + Math.random() * 0.3;
                            this.stateDirty = true;
                            if (window.CombatProfiler) window.CombatProfiler.end('animação de ataque');
                            return;
                        }
                        this.ammo--;
                    }

                    const spawnPos = _spawnPosCache.set(this.x, this.y + 0.8, this.z);
                    const baseDamage = isNapoleonicTheme() ? (35 + Math.floor(Math.random() * 15)) : (12 + Math.floor(Math.random() * 8));
                    // Sistema de força: dano da flecha escala pela razão Ataque/Defesa
                    let damage = baseDamage;
                    if (CONFIG.STRENGTH_SYSTEM_ENABLED && this.target.defenseStrength) {
                        damage = Math.max(1, Math.round(baseDamage * (this.attackStrength / this.target.defenseStrength)));
                    }
                    
                    let wasTreeDefended = false;
                    if (typeof checkNearTree === 'function') {
                        wasTreeDefended = checkNearTree(this.target, 3.5);
                    }
                    
                    let isBlocked = false;
                    if (wasTreeDefended && Math.random() < 0.4) {
                        isBlocked = true;
                    } else if (this.target.role === 'melee' && Math.random() < 0.3) {
                        isBlocked = true;
                        wasTreeDefended = false;
                    }

                    if (typeof playArrowReleaseSound === 'function') {
                        playArrowReleaseSound();
                    }

                    const arrow = ArrowPool.get(spawnPos, this.target, damage, this.faction, isBlocked, wasTreeDefended, this);
                    battleManager.addArrow(arrow);
                }
            }
        }
        if (window.CombatProfiler) window.CombatProfiler.end('animação de ataque');
    }
    applyPoseToDummy(dummy) {
        if (dummy === this.dummy) {
            this.cacheDummyParts();
        }

        if (window.PerformanceProfiler) window.PerformanceProfiler.start('lod_render');
        const lodPrimitive = (dummy === this.dummy) ? this._cachedLodPrimitive : dummy.getObjectByName("lodPrimitive");
        if (this.lodLevel === 2) {
            if (lodPrimitive) {
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('visibilidade');
                lodPrimitive.visible = true;
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('visibilidade');
            }
            for (let i = 0; i < dummy.children.length; i++) {
                if (dummy.children[i] !== lodPrimitive) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('visibilidade');
                    dummy.children[i].visible = false;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('visibilidade');
                }
            }
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('lod_render');
            return;
        }

        if (lodPrimitive) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('visibilidade');
            lodPrimitive.visible = false;
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('visibilidade');
        }
        for (let i = 0; i < dummy.children.length; i++) {
            if (dummy.children[i] !== lodPrimitive) {
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('visibilidade');
                dummy.children[i].visible = true;
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('visibilidade');
            }
        }
        if (window.PerformanceProfiler) window.PerformanceProfiler.end('lod_render');

        const torso = (dummy === this.dummy) ? this._cachedTorso : dummy.getObjectByName("torso");
        const armL = (dummy === this.dummy) ? this._cachedArmL : dummy.getObjectByName("armL");
        const armR = (dummy === this.dummy) ? this._cachedArmR : dummy.getObjectByName("armR");
        const legL = (dummy === this.dummy) ? this._cachedLegL : dummy.getObjectByName("legL");
        const legR = (dummy === this.dummy) ? this._cachedLegR : dummy.getObjectByName("legR");

        if (this.lodLevel === 1) {
            if (armL) armL.visible = false;
            if (armR) armR.visible = false;
            if (legL) legL.visible = false;
            if (legR) legR.visible = false;
        }

        const napoleonicGltf = (dummy === this.dummy) ? this._cachedNapoleonicGltf : dummy.getObjectByName("napoleonic_gltf");
        const bowGroup = (dummy === this.dummy) ? this._cachedBowGroup : dummy.getObjectByName("bowGroup");
        const bowString = (dummy === this.dummy) ? this._cachedBowString : dummy.getObjectByName("bowString");
        const torchGroup = (dummy === this.dummy) ? this._cachedTorchGroup : dummy.getObjectByName("torchGroup");

        if (torchGroup) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('tochas');
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('visibilidade');
            torchGroup.visible = (this.isPusher && this.hasTorch);
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('visibilidade');
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('tochas');
        }
        if (bowGroup && (this.isDaggerArcher || (this.isPusher && isNapoleonicTheme()))) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('visibilidade');
            bowGroup.visible = false;
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('visibilidade');
        }

        if (this.isDead) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
            if (armL) armL.rotation.x = 0;
            if (armR) armR.rotation.x = 0;
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');

            if (window.PerformanceProfiler) window.PerformanceProfiler.start('pernas');
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
            if (legL) legL.rotation.x = 0;
            if (legR) legR.rotation.x = 0;
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('pernas');
            return;
        }

        if (this.isAttacking) {
            const isShooter = (this.role === 'archer' || isNapoleonicTheme()) && !this.isDaggerArcher;
            if (!isShooter) {
                const swing = Math.sin(this.attackAnimProgress * Math.PI);
                if (armR) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                    armR.rotation.x = Math.PI / 6 + swing * 1.5;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                    armR.position.z = -swing * 0.4;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                }
            } else {
                const swing = Math.sin(this.attackAnimProgress * Math.PI);
                if (napoleonicGltf) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                    napoleonicGltf.rotation.x = -0.2 - swing * 0.15;
                    napoleonicGltf.rotation.z = swing * 0.05;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                    napoleonicGltf.position.y = 0;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                } else if (isNapoleonicTheme()) {
                    if (armL) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armL.rotation.set(-1.2, 0.6, 0);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        armL.position.set(-0.5, 1.275, 0.2);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (armR) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armR.rotation.set(-1.4, -0.4, 0);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        armR.position.set(0.5, 1.275, 0.2);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (bowGroup) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        bowGroup.rotation.set(-0.35, -0.6, 0);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        bowGroup.position.set(0.2, -0.9, -0.3);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                    }
                } else {
                    if (armL) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armL.rotation.x = -Math.PI / 2;
                        armL.rotation.y = -Math.PI / 6;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (armR) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armR.rotation.x = -Math.PI / 2.5;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        armR.position.z = swing * 0.45;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (bowString) bowString.scale.z = 1.0 + swing * 3.5;
                }
            }
        } else if (this.isTryingToMove) {
            const modifier = this.knockback && this.knockback.lengthSq() > 0 ? -1 : 1;
            const animTime = this.animTime || 0;
            const swing = Math.sin(animTime) * 0.7 * modifier;
            
            if (napoleonicGltf) {
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                napoleonicGltf.rotation.z = Math.sin(animTime) * 0.08;
                napoleonicGltf.rotation.x = -0.12;
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                napoleonicGltf.position.y = Math.abs(Math.sin(animTime * 2)) * 0.08;
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
            } else {
                if (legL) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('pernas');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                    legL.rotation.x = swing;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('pernas');
                }
                if (legR) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('pernas');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                    legR.rotation.x = -swing;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('pernas');
                }
                if (isNapoleonicTheme()) {
                    if (armL) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armL.rotation.set(swing * 0.5, 0, Math.PI / 12);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        armL.position.set(-0.85, 1.275, 0);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (armR) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armR.rotation.set(0.43, 0, -0.05);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        armR.position.set(0.85, 1.275, 0);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (bowGroup) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        bowGroup.rotation.set(-1.55, 0, 0);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        bowGroup.position.set(0, -0.1, -0.3);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                    }
                } else {
                    if (armL) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armL.rotation.x = -swing * 0.5;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (armR) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armR.rotation.x = swing * 0.5;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                }
                if (torso) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                    torso.position.y = isNapoleonicTheme() ? 0.525 + Math.abs(Math.sin(animTime * 2)) * 0.15 : Math.abs(Math.sin(animTime * 2)) * 0.15;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                }
            }
        } else {
            const animTime = this.animTime || 0;
            if (napoleonicGltf) {
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                napoleonicGltf.rotation.z = Math.sin(animTime * 0.3) * 0.015;
                napoleonicGltf.rotation.x = 0;
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                napoleonicGltf.position.y = 0;
                if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
            } else {
                if (legL) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('pernas');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                    legL.rotation.x = 0;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('pernas');
                }
                if (legR) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('pernas');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                    legR.rotation.x = 0;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('pernas');
                }
                if (torso) {
                    if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                    torso.position.y = isNapoleonicTheme() ? 0.525 : 0;
                    if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                }
                
                if (isNapoleonicTheme()) {
                    if (armL) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armL.rotation.set(0, 0, Math.PI / 12);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        armL.position.set(-0.85, 1.275, 0);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (armR) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armR.rotation.set(0.43, 0, -0.05);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        armR.position.set(0.85, 1.275, 0);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (bowGroup) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        bowGroup.rotation.set(-1.55, 0, 0);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        bowGroup.position.set(0, -0.1, -0.3);
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                    }
                } else {
                    const breathing = Math.sin(animTime * 0.2) * 0.1;
                    if (armL) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armL.rotation.z = -breathing;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (armR) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armR.rotation.z = breathing;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    
                    if (armR) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('posicao');
                        armR.position.z = 0;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('posicao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (armR) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armR.rotation.x = 0;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (armL) {
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('bracos');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.start('rotacao');
                        armL.rotation.x = 0;
                        armL.rotation.y = 0;
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('rotacao');
                        if (window.PerformanceProfiler) window.PerformanceProfiler.end('bracos');
                    }
                    if (bowString) bowString.scale.z = 1.0;
                }
            }
        }
    }
}
