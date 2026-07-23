// --- CLASSE BOULDER (PROJÉTIL DA CATAPULTA) ---
class Boulder {
    constructor(startPos, targetPos, damage, splashRadius, faction) {
        this.mesh = new THREE.Mesh(boulderGeo, boulderMat);
        this.themeStr = isNapoleonicTheme() ? 'napoleonic' : 'medieval';
        this.envStr = currentEnv;
        this.buildMesh();
        
        scene.add(this.mesh);

        this.startPos = new THREE.Vector3();
        this.targetPos = new THREE.Vector3();
        this.dirXZ = new THREE.Vector3();

        this.init(startPos, targetPos, damage, splashRadius, faction);
    }

    buildMesh() {
        const isCannonBall = (this.themeStr === 'napoleonic');
        const isNight = (this.envStr === 'noite');
        const activeBoulderMat = isNight ? fireBoulderMat : boulderMat;
        
        this.mesh.geometry = boulderGeo;
        this.mesh.material = activeBoulderMat;
        
        if (isCannonBall) {
            this.mesh.scale.set(0.7, 0.7, 0.7);
        } else {
            this.mesh.scale.set(1.0, 1.0, 1.0);
        }
    }

    init(startPos, targetPos, damage, splashRadius, faction) {
        this.faction = faction;
        this.damage = damage;
        this.splashRadius = splashRadius;
        this.isDead = false;
        this.bounceCount = 0;

        const currentThemeStr = isNapoleonicTheme() ? 'napoleonic' : 'medieval';
        const currentEnvStr = currentEnv;
        
        if (this.themeStr !== currentThemeStr || this.envStr !== currentEnvStr) {
            this.themeStr = currentThemeStr;
            this.envStr = currentEnvStr;
            this.buildMesh();
        }

        this.startPos.copy(startPos);
        this.targetPos.copy(targetPos);

        const dx = targetPos.x - startPos.x;
        const dz = targetPos.z - startPos.z;
        this.horizontalDist = Math.sqrt(dx * dx + dz * dz);
        this.dirXZ.set(dx, 0, dz).normalize();
        const isCannonBall = (this.themeStr === 'napoleonic');
        this.speedXZ = isCannonBall ? 100 : 35;
        this.totalTime = this.horizontalDist / this.speedXZ;
        this.elapsedTime = 0;
        this.arcHeight = isCannonBall ? 0.5 : Math.min(30, this.horizontalDist * 0.35);

        this.mesh.position.copy(startPos);
        this.mesh.visible = true;
    }

    update(delta, simSpeed) {
        if (this.isDead) return;

        this.elapsedTime += delta * simSpeed;

        if (this.elapsedTime >= this.totalTime) {
            this.mesh.position.copy(this.targetPos);
            this.impact();
            return;
        }

        const progress = this.elapsedTime / this.totalTime;
        const dist = this.speedXZ * this.elapsedTime;

        this.mesh.position.x = this.startPos.x + this.dirXZ.x * dist;
        this.mesh.position.z = this.startPos.z + this.dirXZ.z * dist;
        this.mesh.position.y = this.startPos.y +
            progress * (this.targetPos.y - this.startPos.y) +
            this.arcHeight * Math.sin(progress * Math.PI);

        if (currentEnv === 'noite') {
            for (let i = 0; i < 4; i++) {
                const p = ParticlePool.get();
                if (p) {
                    p.mesh.material = sparkMaterial;
                    p.mesh.position.copy(this.mesh.position);
                    p.mesh.position.x += (Math.random() - 0.5) * 1.0;
                    p.mesh.position.y += (Math.random() - 0.5) * 1.0;
                    p.mesh.position.z += (Math.random() - 0.5) * 1.0;
                    p.mesh.scale.set(2.0, 2.0, 2.0);
                    p.mesh.visible = true;

                    p.velocity.set(
                        -this.dirXZ.x * 5 + (Math.random() - 0.5) * 3,
                        2.0 + Math.random() * 4,
                        -this.dirXZ.z * 5 + (Math.random() - 0.5) * 3
                    );
                    p.life = 0.5 + Math.random() * 0.4;
                    p.maxLife = p.life;
                    p.type = 'boulder_fire';
                    battleManager.addParticle(p);
                }
            }
        }

        const terrainY = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        if (this.mesh.position.y < terrainY + 0.2) {
            this.mesh.position.y = terrainY + 0.2;
            this.impact();
        }
    }

    impact() {
        const ipx = this.mesh.position.x;
        const ipy = this.mesh.position.y;
        const ipz = this.mesh.position.z;
        const enemies = window.armies[this.faction].enemies;

        const dmgMultiplier = (this.bounceCount === 0) ? 1.0 : 0.6;
        const radiusMultiplier = (this.bounceCount === 0) ? 1.0 : 0.75;
        const currentSplashRadius = this.splashRadius * radiusMultiplier;
        const currentSplashSq = currentSplashRadius * currentSplashRadius;

        for (let i = 0; i < enemies.length; i++) {
            const w = enemies[i];
            if (w.isDead) continue;
            const dx = w.x - ipx;
            const dz = w.z - ipz;
            const distSq = dx * dx + dz * dz;
            if (distSq < currentSplashSq) {
                const dist = Math.sqrt(distSq);
                const falloff = 1.0 - dist / currentSplashRadius * 0.5;
                w.takeDamage(Math.round(this.damage * dmgMultiplier * falloff), null);
                _tmpVec3D.set(dx || 0.1, 0, dz || 0.1).normalize();
                const launchStrength = 18 * (1.0 - dist / currentSplashRadius) * dmgMultiplier;
                w.applyKnockback(_tmpVec3D, 14 * dmgMultiplier, 0.8 * dmgMultiplier, launchStrength);
            }
        }

        _tmpVec3E.set(ipx, ipy, ipz);
        if (currentEnv === 'noite') {
            for (let i = 0; i < 3; i++) {
                _tmpVec3E.set(
                    ipx + (Math.random() - 0.5) * 1.5,
                    ipy,
                    ipz + (Math.random() - 0.5) * 1.5
                );
                createSparks(_tmpVec3E, false);
            }
        } else {
            createSparks(_tmpVec3E, false);
            _tmpVec3E.set(ipx + 0.5, ipy, ipz);
            createSparks(_tmpVec3E, false);
            _tmpVec3E.set(ipx, ipy, ipz + 0.5);
            createSparks(_tmpVec3E, false);
        }
        playClangSound(0.9 * dmgMultiplier);

        if (this.bounceCount === 0) {
            this.bounceCount = 1;

            this.startPos.copy(this.mesh.position);

            const bounceDist = Math.max(6, this.horizontalDist * 0.18);
            this.targetPos.copy(this.startPos).addScaledVector(this.dirXZ, bounceDist);
            this.targetPos.y = getTerrainHeight(this.targetPos.x, this.targetPos.z);
            this.horizontalDist = bounceDist;
            this.arcHeight = Math.max(1.0, this.arcHeight * 0.18);
            this.speedXZ *= 0.45;
            this.totalTime = this.horizontalDist / this.speedXZ;
            this.elapsedTime = 0;
        } else {
            this.isDead = true;
            if (this.mesh) {
                this.mesh.visible = false;
            }
        }
    }
}