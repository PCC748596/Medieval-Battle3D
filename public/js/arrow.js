let arrowUidCounter = 0;
const _currentTargetPosCache = new THREE.Vector3();

// --- CLASSE DOS PROJETEIS DE FLECHA COM TRACER SUBTIL E BRANCO ---
class Arrow {
    get x() { return this.mesh.position.x; }
    get y() { return this.mesh.position.y; }
    get z() { return this.mesh.position.z; }

    constructor(spawnPos, target, damage, faction, isBlocked, wasTreeDefended, shooter = null) {
        this.uid = arrowUidCounter++;
        this.mesh = new THREE.Group();
        this.themeStr = isNapoleonicTheme() ? 'napoleonic' : 'medieval';
        this.buildMesh();
        
        this.startPos = new THREE.Vector3();
        this.targetPos = new THREE.Vector3();
        this.dirXZ = new THREE.Vector3();
        this.prevPos = new THREE.Vector3();

        this.init(spawnPos, target, damage, faction, isBlocked, wasTreeDefended, shooter);
        
        if (typeof scene !== 'undefined') {
            scene.add(this.mesh);
        }
    }

    buildMesh() {
        while(this.mesh.children.length > 0){ 
            this.mesh.remove(this.mesh.children[0]); 
        }
        if (this.themeStr === 'napoleonic') {
            const bulletGeo = new THREE.SphereGeometry(0.12, 4, 4);
            const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
            const bullet = new THREE.Mesh(bulletGeo, bulletMat);
            this.mesh.add(bullet);
        } else {
            const shaft = new THREE.Mesh(geomArrowShaft, matArrowShaft);
            shaft.rotation.x = Math.PI / 2;
            this.mesh.add(shaft);

            const isNight = (currentEnv === 'noite');
            const tipMat = isNight ? sparkMaterial : matArrowTip;
            const tip = new THREE.Mesh(geomArrowTip, tipMat);
            tip.rotation.x = Math.PI / 2;
            tip.position.set(0, 0, 0.6);
            this.mesh.add(tip);
        }
    }

    init(spawnPos, target, damage, faction, isBlocked, wasTreeDefended, shooter = null) {
        this.faction = faction;
        this.target = target;
        this.damage = isBlocked ? 0 : damage;
        this.isBlocked = isBlocked;
        this.wasTreeDefended = wasTreeDefended;
        this.shooter = shooter;
        this.isDead = false;

        const currentThemeStr = isNapoleonicTheme() ? 'napoleonic' : 'medieval';
        if (this.themeStr !== currentThemeStr) {
            this.themeStr = currentThemeStr;
            this.buildMesh();
        }

        this.startPos.copy(spawnPos);
        if (target) {
            this.targetPos.set(target.x, target.y, target.z);
        } else {
            this.targetPos.copy(spawnPos);
        }

        // Adiciona dispersão física realista no ponto de impacto baseada na distância
        const dist = this.startPos.distanceTo(this.targetPos);
        const dispersion = Math.min(2.0, dist * 0.05);
        this.targetPos.x += (Math.random() - 0.5) * dispersion;
        this.targetPos.z += (Math.random() - 0.5) * dispersion;

        this.targetPos.y += 0.3; // Altura do peito

        const dx = this.targetPos.x - this.startPos.x;
        const dz = this.targetPos.z - this.startPos.z;
        this.horizontalDist = Math.sqrt(dx * dx + dz * dz);

        this.dirXZ.set(dx, 0, dz).normalize();

        this.speedXZ = isNapoleonicTheme() ? 65 : 25;
        this.totalTime = this.horizontalDist / this.speedXZ;
        this.elapsedTime = 0;

        this.arcHeight = isNapoleonicTheme() ? 0.3 : Math.min(16, this.horizontalDist * 0.24);

        this.mesh.position.copy(this.startPos);
        this.mesh.visible = true;

        this.prevPos.copy(this.startPos);
    }

    update(delta, simSpeed) {
        if (this.isDead) return;

        this.prevPos.copy(this.mesh.position);
        this.elapsedTime += delta * simSpeed;

        // EFEITO VISUAL: Rastro de vento (otimizado com base no LOD)
        let numParticles = 2;
        if (this.target && this.target.lodLevel !== undefined) {
            if (this.target.lodLevel >= 2) {
                numParticles = 0; // Salta completamente o rastro para alvos distantes
            } else if (this.target.lodLevel === 1) {
                numParticles = (simulationFrame % 2 === 0) ? 1 : 0; // Reduz para 50% em distância média
            }
        }

        const isNight = (currentEnv === 'noite');
        for (let i = 0; i < numParticles; i++) {
            const progressOffset = Math.random() * 0.7;
            const p = ParticlePool.get();
            if (p) {
                p.mesh.material = isNight ? sparkMaterial : arrowTrailMaterial;
                p.mesh.position.copy(this.mesh.position).addScaledVector(this.dirXZ, -progressOffset);
                if (isNight) {
                    p.mesh.scale.set(1.2, 1.2, 1.2);
                    p.velocity.set(
                        (Math.random() - 0.5) * 0.8,
                        0.5 + Math.random() * 1.0,
                        (Math.random() - 0.5) * 0.8
                    );
                    p.life = 0.4;
                    p.maxLife = 0.4;
                    p.type = 'ember';
                } else {
                    p.mesh.scale.set(0.9, 0.9, 0.9);
                    p.velocity.set(
                        (Math.random() - 0.5) * 0.2,
                        (Math.random() - 0.5) * 0.2,
                        (Math.random() - 0.5) * 0.2
                    );
                    p.life = 0.35;
                    p.maxLife = 0.35;
                    p.type = 'trail';
                }
                p.mesh.visible = true;
                battleManager.addParticle(p);
            }
        }

        if ((simulationFrame + this.uid) % 2 === 0) {
            if (checkArrowLogCollision(this)) {
                this.isDead = true;
                createSparks(this.mesh.position, false);
                playClangSound(0.2);
                return;
            }

            if (checkArrowTreeCollision(this)) {
                this.isDead = true;
                createSparks(this.mesh.position, true); // Arranca folhas!
                playClangSound(0.1);
                return;
            }
        }

        if (this.elapsedTime >= this.totalTime) {
            this.mesh.position.copy(this.targetPos);
            this.isDead = true;

            if (this.target && !this.target.isDead) {
                const currentTargetPos = _currentTargetPosCache.set(this.target.x, this.target.y, this.target.z);
                currentTargetPos.y += 0.3;
                const distToTarget = this.mesh.position.distanceTo(currentTargetPos);
                const hitRadius = (this.target.constructor.name === 'Catapult') ? 4.0 : 1.4;

                if (distToTarget < hitRadius) {
                    if (this.isBlocked) {
                        if (this.wasTreeDefended) {
                            createSparks(this.targetPos, true);
                            playClangSound(0.2);
                        } else {
                            createSparks(this.targetPos, false);
                            playClangSound(0.25);
                        }
                    } else {
                        this.target.takeDamage(this.damage, this.shooter);
                        if (this.shooter && !this.shooter.isDead && this.shooter.constructor.name === 'Warrior') {
                            this.shooter.morale = Math.min(10, this.shooter.morale + 1);
                        }
                        createSparks(this.targetPos, false);
                        playClangSound(0.4);
                    }
                }
            }
            return;
        }

        const progress = this.elapsedTime / this.totalTime;
        const currentDist = this.speedXZ * this.elapsedTime;

        const currentX = this.startPos.x + this.dirXZ.x * currentDist;
        const currentZ = this.startPos.z + this.dirXZ.z * currentDist;

        const currentY = this.startPos.y + progress * (this.targetPos.y - this.startPos.y) + this.arcHeight * Math.sin(progress * Math.PI);

        this.mesh.position.set(currentX, currentY, currentZ);

        _tmpVec3A.subVectors(this.mesh.position, this.prevPos);
        if (_tmpVec3A.lengthSq() > 0.0001) {
            _tmpVec3B.copy(this.mesh.position).add(_tmpVec3A);
            this.mesh.lookAt(_tmpVec3B);
        }

        const terrainY = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        if (this.mesh.position.y < terrainY + 0.1 ||
            Math.abs(this.mesh.position.x) > sizeX ||
            Math.abs(this.mesh.position.z) > sizeZ) {
            this.isDead = true;
        }
    }
}