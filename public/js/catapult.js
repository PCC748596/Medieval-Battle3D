// --- CLASSE CATAPULTA ---
const _tmpCatapultVecA = new THREE.Vector3();
const _tmpCatapultVecB = new THREE.Vector3();
const _tmpCatapultVecC = new THREE.Vector3();

class Catapult {
    get x() { return this.mesh.position.x; }
    set x(val) { this.mesh.position.x = val; }
    get y() { return this.mesh.position.y; }
    set y(val) { this.mesh.position.y = val; }
    get z() { return this.mesh.position.z; }
    set z(val) { this.mesh.position.z = val; }

    constructor(faction, x, z) {
        this.faction = faction;
        this.isCatapult = true;
        this.hp = 500;
        this.maxHp = 500;
        this.isDead = false;
        this.attackerCount = 0;
        this.attackers = new Set();
        this.fireRate = 12;
        this.fireCooldown = 3 + Math.random() * 6;
        this.damage = 90;
        this.splashRadius = 4.5;
        this.attackRange = 160; // cobre o campo todo; alcance mínimo é definido por D10+10 a cada disparo
        this.radius = 2.5;
        this.armAngle = 0;        // ângulo atual do braço
        this.armTargetAngle = 0;  // ângulo alvo (0=recarregado, PI*0.75=disparado)
        this.isFiring = false;
        this.isAiming = false;
        this.targetX = 0;
        this.targetZ = 0;
        this.armAnimTimer = 0;
        this.pushers = [];
        this.pendingTargetPos = new THREE.Vector3();

        this.mesh = this.buildMesh();
        const terrainY = getTerrainHeight(x, z);
        this.terrainY = terrainY;
        this.mesh.position.set(x, terrainY + 0.64, z);

        // Roda catapulta para encarar o centro da batalha
        this.mesh.rotation.y = window.armies[faction].catapultRotationY;
        this.mesh.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        this.lodPrimitive = this.mesh.getObjectByName('lodPrimitive');
    }

    buildCannonMesh() {
        const g = new THREE.Group();

        const lodPrimitive = new THREE.Mesh(lodGeoCatapult, lodBrownMat);
        lodPrimitive.name = 'lodPrimitive';
        lodPrimitive.position.y = 3.0;
        lodPrimitive.visible = false;
        g.add(lodPrimitive);

        // Carriage (corpo de madeira)
        // Largura aumentada em 20% extras (1.6 * 1.2 * 1.2 = 2.3)
        // Altura/Comprimento aumentados em 20% (1.0 * 1.2 = 1.2, 4.0 * 1.2 = 4.8)
        const carriage = new THREE.Mesh(cannonCarriageGeo, catapultWoodMat);
        carriage.position.set(0, 1.44, 0.6);
        carriage.rotation.x = 0.15;
        g.add(carriage);

        // 2 big spoked wheels
        this.wheels = [];
        [[-1.44, 1.92, -0.6], [1.44, 1.92, -0.6]].forEach(([wx, wy, wz]) => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(wx, wy, wz);
            wheelGroup.rotation.y = Math.PI / 2;

            const rim = new THREE.Mesh(cannonRimGeo, catapultDarkWoodMat);
            wheelGroup.add(rim);

            const hub = new THREE.Mesh(cannonHubGeo, catapultDarkWoodMat);
            hub.rotation.x = Math.PI / 2;
            wheelGroup.add(hub);

            for (let i = 0; i < 9; i++) {
                const angle = (Math.PI * i) / 9;
                const spoke = new THREE.Mesh(cannonSpokeGeo, catapultWoodMat);
                spoke.rotation.z = angle;
                wheelGroup.add(spoke);
            }

            g.add(wheelGroup);
            this.wheels.push(wheelGroup);
        });

        // Axle
        const axle = new THREE.Mesh(cannonAxleGeo, catapultMetalMat);
        axle.position.set(0, 1.92, -0.6);
        axle.rotation.z = Math.PI / 2;
        g.add(axle);

        // Barrel group (for recoil)
        this.armGroup = new THREE.Group();
        this.armGroup.position.set(0, 2.64, -0.6);
        this.armGroup.rotation.x = 0;

        // Use a bronze material
        const bronzeMat = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
        const barrel = new THREE.Mesh(cannonBarrelGeo, bronzeMat);
        // Rotaciona para que o muzzle (menor) fique em -Z (frente)
        barrel.rotation.x = -Math.PI / 2;
        // Move o barril mais pra frente do conjunto (-Z)
        barrel.position.z = -1.2;
        this.armGroup.add(barrel);

        const back = new THREE.Mesh(cannonBackGeo, bronzeMat);
        // 5.4 / 2 = 2.7.  2.7 - 1.2 = 1.5
        back.position.z = 1.5;
        this.armGroup.add(back);

        this.bucket = new THREE.Group();
        // -2.7 - 1.2 = -3.9
        this.bucket.position.set(0, 0, -3.9);
        this.armGroup.add(this.bucket);

        g.add(this.armGroup);

        return g;
    }

    buildMesh() {
        if (isNapoleonicTheme()) {
            return this.buildCannonMesh();
        }
        const g = new THREE.Group();

        const lodPrimitive = new THREE.Mesh(lodGeoCatapult, lodBrownMat);
        lodPrimitive.name = 'lodPrimitive';
        lodPrimitive.position.y = 2.5;
        lodPrimitive.visible = false;
        g.add(lodPrimitive);

        // Base/plataforma (2x)
        const base = new THREE.Mesh(cataBaseGeo, catapultWoodMat);
        base.position.y = 1.1;
        g.add(base);

        // 4 rodas (2x)
        this.wheels = [];
        [[-2.6, 0.56, 1.6], [2.6, 0.56, 1.6], [-2.6, 0.56, -1.6], [2.6, 0.56, -1.6]].forEach(([wx, wy, wz]) => {
            const wheel = new THREE.Mesh(cataWheelGeo, catapultDarkWoodMat);
            wheel.position.set(wx, wy, wz);
            wheel.rotation.z = Math.PI / 2;
            g.add(wheel);
            this.wheels.push(wheel);
        });

        // Eixos das rodas (2x)
        [-2.6, 2.6].forEach(ax => {
            const axle = new THREE.Mesh(ax === -2.6 ? cataAxleGeo1 : cataAxleGeo2, catapultMetalMat);
            axle.position.set(ax, 0.56, 0);
            axle.rotation.x = Math.PI / 2;
            g.add(axle);
        });

        // 2 suportes verticais (2x)
        [-1.4, 1.4].forEach(sx => {
            const sup = new THREE.Mesh(cataSupportGeo, catapultWoodMat);
            sup.position.set(sx, 3.8, 0);
            g.add(sup);
        });

        // Travessa horizontal entre suportes (2x)
        const cross = new THREE.Mesh(cataCrossGeo, catapultDarkWoodMat);
        cross.position.set(0, 5.8, 0);
        g.add(cross);

        // Braço giratório (pivot na travessa, 2x)
        this.armGroup = new THREE.Group();
        this.armGroup.position.set(0, 3.6, 0);
        this.armGroup.rotation.x = 1.31; // posição de repouso: braço quase deitado (~15° do horizontal) apontando para o inimigo

        const armLong = new THREE.Mesh(cataArmLongGeo, catapultWoodMat);
        armLong.position.y = 2.4;
        this.armGroup.add(armLong);

        // Contrapeso (2x)
        const counter = new THREE.Mesh(cataCounterGeo, catapultMetalMat);
        counter.position.y = -1.4;
        this.armGroup.add(counter);

        // Caçamba/funda no topo do braço (2x)
        this.bucket = new THREE.Mesh(cataBucketGeo, catapultDarkWoodMat);
        this.bucket.position.y = 5.6;
        this.armGroup.add(this.bucket);

        g.add(this.armGroup);

        return g;
    }

    updateLOD(cameraPos, maxDistSq) {
        const dx = this.mesh.position.x - cameraPos.x;
        const dy = this.mesh.position.y - cameraPos.y;
        const dz = this.mesh.position.z - cameraPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (lodEnabled && radius > 250) {
            if (this.lodPrimitive && !this.lodPrimitive.visible) this.lodPrimitive.visible = true;
            this.mesh.children.forEach(child => {
                if (child !== this.lodPrimitive && child.visible) child.visible = false;
            });
            this.lodLevel = 2;
        } else {
            if (this.lodPrimitive && this.lodPrimitive.visible) this.lodPrimitive.visible = false;
            this.mesh.children.forEach(child => {
                if (child !== this.lodPrimitive && !child.visible) child.visible = true;
            });
            this.lodLevel = 0;
        }
    }

    hasEnemyInRange(opponents) {
        const px = this.mesh.position.x;
        const pz = this.mesh.position.z;
        const rangeSq = this.attackRange * this.attackRange;
        for (let i = 0; i < opponents.length; i++) {
            const e = opponents[i];
            if (e.isDead) continue;
            const dx = e.x - px;
            const dz = e.z - pz;
            if (dx * dx + dz * dz < rangeSq) {
                return true;
            }
        }
        return false;
    }

    hasEnemyInStopRange(opponents) {
        const px = this.mesh.position.x;
        const pz = this.mesh.position.z;
        // A catapulta deve parar de se mover quando houver inimigos no seu alcance de tiro efetivo máximo.
        // Parando a 110 unidades, ela se mantém em uma distância segura e extremamente letal.
        const stopRange = 110;
        const stopRangeSq = stopRange * stopRange;
        for (let i = 0; i < opponents.length; i++) {
            const e = opponents[i];
            if (e.isDead) continue;
            const dx = e.x - px;
            const dz = e.z - pz;
            if (dx * dx + dz * dz < stopRangeSq) {
                return true;
            }
        }
        return false;
    }

    update(opponents, delta, simSpeed) {
        if (this.isDead) return;
        // Rotaciona em direção ao alvo se estiver atirando ou mirando, ou volta para a frente
        if (this.isFiring || this.isAiming) {
            _tmpCatapultVecA.set(this.targetX, this.mesh.position.y, this.targetZ);
            _tmpCatapultVecB.copy(this.mesh.position).multiplyScalar(2).sub(_tmpCatapultVecA);
            const currentRotation = this.mesh.rotation.y;
            this.mesh.lookAt(_tmpCatapultVecB);
            const targetRotation = this.mesh.rotation.y;
            this.mesh.rotation.y = currentRotation;

            let diff = targetRotation - currentRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            this.mesh.rotation.y += diff * Math.min(delta * simSpeed * 4.0, 1.0);

            // Se a rotação estiver quase alinhada durante a mira, inicia o disparo
            if (this.isAiming && Math.abs(diff) < 0.05) {
                this.isAiming = false;
                this.fire();
                this.fireCooldown = this.fireRate;
            }
        } else {
            const targetRotation = window.armies[this.faction].catapultRotationY;
            let diff = targetRotation - this.mesh.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            this.mesh.rotation.y += diff * Math.min(delta * simSpeed * 2.0, 1.0);
        }

        // Verifica se há inimigos ao alcance de parada e se há empurradores vivos
        const hasTarget = this.hasEnemyInStopRange(opponents);
        const hasPusherAlive = this.pushers.length > 0 && this.pushers.some(p => !p.isDead);
        const canMove = !hasTarget && hasPusherAlive && opponents.some(o => !o.isDead);

        if (canMove) {
            let terrainSpeed = 1.0;
            for (let i = 0; i < muds.length; i++) {
                const dx = this.mesh.position.x - muds[i].x;
                const dz = this.mesh.position.z - muds[i].z;
                if (dx * dx + dz * dz < muds[i].r * muds[i].r) {
                    terrainSpeed = 0.4;
                    break;
                }
            }

            const speed = 4.0 * terrainSpeed;
            const moveDist = speed * delta * simSpeed;
            const dir = window.armies[this.faction].catapultDir;
            this.mesh.position.x += dir * moveDist;
            this.mesh.position.y = getTerrainHeight(this.mesh.position.x, this.mesh.position.z) + 0.64;

            // Rolamento das rodas
            const wheelRot = moveDist / 1.1;
            if (this.wheels) {
                this.wheels.forEach(w => {
                    if (isNapoleonicTheme()) {
                        w.rotateZ(wheelRot);
                    } else {
                        w.rotateY(wheelRot);
                    }
                });
            }

            // Atualiza os empurradores para se moverem junto com a catapulta em posição de empurrar
            const offsetZValues = [-1.2, 1.2];
            this.pushers.forEach((p, idx) => {
                if (!p.isDead) {
                    const tx = this.mesh.position.x - dir * 3.4;
                    const tz = this.mesh.position.z + offsetZValues[idx];
                    const ty = getTerrainHeight(tx, tz) + 1.5;

                    p.x = tx; p.y = ty; p.z = tz;
                    p.rotY = (dir === 1) ? -Math.PI / 2 : Math.PI / 2;
                    p.lastVelocity.set(dir * speed, 0, 0);
                    p.isTryingToMove = true;
                    
                    if (p.torso) {
                        p.torso.rotation.x = 0.35; // inclina para frente (local space)
                    }
                }
            });
        } else {
            // Se não está se movendo, retorna o torso dos empurradores para a postura ereta
            this.pushers.forEach(p => {
                if (!p.isDead) {
                    p.isTryingToMove = false;
                    p.lastVelocity.set(0, 0, 0);
                }
            });
        }

        // Animação do disparo
        if (isNapoleonicTheme()) {
            if (this.isFiring) {
                this.armAnimTimer -= delta * simSpeed;
                const t = 1.0 - Math.max(0, this.armAnimTimer / 0.5);

                // Recoil: at t=0, z=-0.6; moves back to z=0.6 (recoil), then returns to -0.6
                if (t < 0.2) {
                    this.armGroup.position.z = -0.6 + (t / 0.2) * 1.2;
                } else {
                    this.armGroup.position.z = 0.6 - ((t - 0.2) / 0.8) * 1.2;
                }

                if (this.hasPendingShot && t > 0.05) {
                    this.spawnBoulder();
                }

                if (this.armAnimTimer <= 0) {
                    this.isFiring = false;
                    this.armGroup.position.z = -0.6;
                }
            } else {
                this.armGroup.position.z = -0.6;
            }
        } else {
            // Animação do braço da catapulta
            if (this.isFiring) {
                const prevAngle = this.armGroup.rotation.x;
                this.armAnimTimer -= delta * simSpeed;
                const t = 1.0 - Math.max(0, this.armAnimTimer / 0.5);
                // De +1.31 (quase deitado para trás) até -2.2 (braço jogado para frente/baixo)
                this.armGroup.rotation.x = 1.31 + (-2.2 - 1.31) * t;

                // Solta a bola quando o braço cruzar a posição de ~2 horas (-Math.PI / 4)
                const releaseAngle = -Math.PI / 4;
                if (this.hasPendingShot && prevAngle > releaseAngle && this.armGroup.rotation.x <= releaseAngle) {
                    this.spawnBoulder();
                }

                if (this.armAnimTimer <= 0) {
                    this.isFiring = false;
                    this.armGroup.rotation.x = -2.2;
                }
            } else {
                // Retorna lentamente para a posição de repouso carregada (~15° do horizontal)
                const diff = 1.31 - this.armGroup.rotation.x;
                this.armGroup.rotation.x += diff * Math.min(delta * simSpeed * 1.5, 1.0);
            }
        }

        if (!this.isFiring && !this.isAiming) {
            this.fireCooldown -= delta * simSpeed;
            if (this.fireCooldown <= 0) {
                const targetCentroid = this.getTargetCentroid(opponents);
                if (targetCentroid) {
                    this.targetX = targetCentroid.x;
                    this.targetZ = targetCentroid.z;
                    this.isAiming = true;
                } else {
                    this.fireCooldown = 1.0; // Tenta novamente em 1 segundo
                }
            }
        }
    }

    getTargetCentroid(opponents) {
        // Alcance mínimo realista (20 unidades) para a catapulta disparar contra frentes de batalha,
        // garantindo que ela não fique travada sem disparar quando os exércitos se aproximarem.
        const minRange = 20;
        const minRangeSq = minRange * minRange;
        const maxRangeSq = this.attackRange * this.attackRange;

        // Encontra centróide de até 12 inimigos dentro da faixa de alcance
        let cx = 0, cz = 0, count = 0;
        const px = this.mesh.position.x;
        const pz = this.mesh.position.z;

        for (let i = 0; i < opponents.length; i++) {
            const e = opponents[i];
            if (e.isDead) continue;
            const dx = e.x - px;
            const dz = e.z - pz;
            const distSq = dx * dx + dz * dz;
            // Só mira em inimigos dentro do intervalo de segurança [20, 160]
            if (distSq >= minRangeSq && distSq < maxRangeSq) {
                cx += e.x;
                cz += e.z;
                count++;
                if (count >= 12) break;
            }
        }
        if (count === 0) return null;
        return { x: cx / count, z: cz / count };
    }

    fire() {
        // Adiciona imprecisão ao alvo já mirado
        const cx = this.targetX + (Math.random() - 0.5) * 5;
        const cz = this.targetZ + (Math.random() - 0.5) * 5;

        // Salva dados do tiro pendente para ser lançado durante a animação
        this.pendingTargetPos.set(cx, getTerrainHeight(cx, cz), cz);
        this.hasPendingShot = true;

        // Inicia animação do braço (swing de disparo)
        this.isFiring = true;
        this.armAnimTimer = 0.5;
    }

    spawnBoulder() {
        this.hasPendingShot = false;
        if (!this.pendingTargetPos) return;

        // Força a atualização da matriz do mundo para garantir que a posição global da caçamba reflita a rotação atual do braço
        this.mesh.updateMatrixWorld(true);

        this.bucket.getWorldPosition(_tmpCatapultVecC);

        const boulder = BoulderPool.get(_tmpCatapultVecC, this.pendingTargetPos, this.damage, this.splashRadius, this.faction);
        boulders.push(boulder);

        // Smoke effect for Napoleonic cannons
        if (isNapoleonicTheme()) {
            for (let i = 0; i < 20; i++) {
                const p = ParticlePool.get();
                if (p) {
                    p.mesh.material = boulderMat; // Use a dark gray material for smoke
                    p.mesh.position.copy(startPos);
                    p.mesh.position.x += (Math.random() - 0.5) * 1.5;
                    p.mesh.position.y += (Math.random() - 0.5) * 1.5;
                    p.mesh.position.z += (Math.random() - 0.5) * 1.5;
                    const s = 1.0 + Math.random() * 2.0;
                    p.mesh.scale.set(s, s, s);
                    p.mesh.visible = true;

                    p.velocity.set(
                        boulder.dirXZ.x * 12 + (Math.random() - 0.5) * 6,
                        (Math.random() - 0.5) * 6,
                        boulder.dirXZ.z * 12 + (Math.random() - 0.5) * 6
                    );
                    p.life = 0.4 + Math.random() * 0.4;
                    p.maxLife = p.life;
                    p.type = 'boulder_fire'; // Reuse this type to fade nicely
                    battleManager.addParticle(p);
                }
            }
        }
    }

    takeDamage(amount, attacker = null) {
        this.hp -= amount;
        if (this.hp <= 0) this.die();
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isAiming = false;
        this.isFiring = false;
        
        // Transformar todos os materiais em algo queimado/preto
        const charredMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        this.mesh.traverse(child => {
            if (child.isMesh) {
                child.material = charredMat;
            }
        });
        
        createSparks(this.mesh.position, false);
        // Não removemos o mesh, fica como carcaça no campo
    }
}