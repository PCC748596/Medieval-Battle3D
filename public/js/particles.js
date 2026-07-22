// --- 8. SISTEMA DE PARTÍCULAS / FAÍSCAS (VFX) ---
const particleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
const leafMaterial = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
const bloodMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const waterMaterial = new THREE.MeshBasicMaterial({ color: 0x44aaff });

const arrowTrailMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65
});


function createBlood(position) {
    const numParticles = 16 + Math.floor(Math.random() * 12);
    let spawned = 0;
    for (let attempt = 0; attempt < ParticlePool.pool.length && spawned < numParticles; attempt++) {
        const p = ParticlePool.get();
        if (p) {
            p.mesh.material = bloodMaterial;
            p.mesh.position.copy(position);
            p.mesh.position.y += 0.2;
            p.mesh.scale.set(2.2, 2.2, 2.2);
            p.mesh.visible = true;

            p.velocity.set(
                (Math.random() - 0.5) * 5,
                3.0 + Math.random() * 5,
                (Math.random() - 0.5) * 5
            );
            p.life = 0.5 + Math.random() * 0.4;
            p.maxLife = p.life;
            p.type = 'blood';
            battleManager.addParticle(p);
            spawned++;
        }
    }
}

function createWaterSplash(position) {
    const numParticles = 3 + Math.floor(Math.random() * 3);
    let spawned = 0;
    for (let attempt = 0; attempt < ParticlePool.pool.length && spawned < numParticles; attempt++) {
        const p = ParticlePool.get();
        if (p) {
            p.mesh.material = waterMaterial;
            p.mesh.position.copy(position);
            p.mesh.position.y -= 1.4;
            p.mesh.scale.set(1.5, 1.5, 1.5);
            p.mesh.visible = true;

            p.velocity.set(
                (Math.random() - 0.5) * 2,
                4.0 + Math.random() * 4,
                (Math.random() - 0.5) * 2
            );
            p.life = 0.4 + Math.random() * 0.3;
            p.maxLife = p.life;
            p.type = 'water';

            battleManager.addParticle(p);
            spawned++;
        }
    }
}

function createSparks(position, useLeaves) {
    const numSparks = 6 + Math.floor(Math.random() * 4);
    const activeMat = useLeaves ? leafMaterial : sparkMaterial;

    let spawned = 0;
    for (let attempt = 0; attempt < ParticlePool.pool.length && spawned < numSparks; attempt++) {
        const p = ParticlePool.get();
        if (p) {
            p.mesh.material = activeMat;
            p.mesh.position.copy(position);
            p.mesh.position.y += 0.5;
            p.mesh.scale.set(1.0, 1.0, 1.0);
            p.mesh.visible = true;

            p.velocity.set(
                (Math.random() - 0.5) * 5,
                2.5 + Math.random() * 3,
                (Math.random() - 0.5) * 5
            );
            p.life = 0.8;
            p.maxLife = 0.8;
            p.type = useLeaves ? 'leaf' : 'spark';

            battleManager.addParticle(p);
            spawned++;
        }
    }
}

function updateParticles(delta) {
    const activeParticles = battleManager.getParticles();
    for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.life -= delta;

        if (p.life <= 0) {
            ParticlePool.release(p);
            // Swap-and-pop para evitar O(N) shift
            activeParticles[i] = activeParticles[activeParticles.length - 1];
            activeParticles.pop();
        } else {
            if (p.type !== 'trail' && p.type !== 'ember') {
                p.velocity.y -= 9.8 * delta;
            }
            if (p.type === 'ember') {
                p.velocity.y += 0.5 * delta;
            }
            p.mesh.position.addScaledVector(p.velocity, delta);

            if (p.type === 'blood') {
                const ratio = p.life / p.maxLife;
                p.mesh.scale.set(ratio * 2.2, ratio * 2.2, ratio * 2.2);
            } else if (p.type === 'ember') {
                const ratio = p.life / p.maxLife;
                p.mesh.scale.set(ratio * 1.2, ratio * 1.2, ratio * 1.2);
            } else if (p.type === 'boulder_fire') {
                const ratio = p.life / p.maxLife;
                p.mesh.scale.set(ratio * 2.0, ratio * 2.0, ratio * 2.0);
            }
        }
    }
}
const ArrowPool = {
    pool: [],

    get: function(spawnPos, target, damage, faction, isBlocked, wasTreeDefended, shooter = null) {
        if (this.pool.length > 0) {
            const arrow = this.pool.pop();
            arrow.init(spawnPos, target, damage, faction, isBlocked, wasTreeDefended, shooter);
            return arrow;
        } else {
            return new Arrow(spawnPos, target, damage, faction, isBlocked, wasTreeDefended, shooter);
        }
    },

    release: function(arrow) {
        arrow.isDead = true;
        if (arrow.mesh) {
            arrow.mesh.visible = false;
        }
        this.pool.push(arrow);
    },

    releaseAll: function(activeArrowsArray) {
        for (let i = 0; i < activeArrowsArray.length; i++) {
            this.release(activeArrowsArray[i]);
        }
        activeArrowsArray.length = 0;
    }
};

const BoulderPool = {
    pool: [],

    get: function(startPos, targetPos, damage, splashRadius, faction) {
        if (this.pool.length > 0) {
            const boulder = this.pool.pop();
            boulder.init(startPos, targetPos, damage, splashRadius, faction);
            return boulder;
        } else {
            return new Boulder(startPos, targetPos, damage, splashRadius, faction);
        }
    },

    release: function(boulder) {
        boulder.isDead = true;
        if (boulder.mesh) {
            boulder.mesh.visible = false;
        }
        this.pool.push(boulder);
    },

    releaseAll: function(activeBouldersArray) {
        for (let i = 0; i < activeBouldersArray.length; i++) {
            this.release(activeBouldersArray[i]);
        }
        activeBouldersArray.length = 0;
    }
};

const ParticlePool = {
    pool: [],
    freeIndex: 0,
    MAX_PARTICLES: 800,
    isInitialized: false,

    initPool: function(particleGeometry, sparkMaterial) {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            const mesh = new THREE.Mesh(particleGeometry, sparkMaterial);
            mesh.visible = false;
            // Particles MUST be in the scene to be rendered!
            if (typeof scene !== 'undefined') {
                scene.add(mesh);
            }
            this.pool.push({
                mesh: mesh,
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 0,
                type: 'spark'
            });
        }
    },

    get: function() {
        if (!this.isInitialized) return null;
        
        const poolLen = this.pool.length;
        for (let attempt = 0; attempt < poolLen; attempt++) {
            this.freeIndex = (this.freeIndex + 1) % poolLen;
            const p = this.pool[this.freeIndex];
            if (p.life <= 0) {
                return p;
            }
        }
        return null; // Pool cheia
    },

    release: function(particle) {
        particle.life = 0;
        if (particle.mesh) {
            particle.mesh.visible = false;
        }
    },

    releaseAll: function(activeParticlesArray) {
        for (let i = 0; i < activeParticlesArray.length; i++) {
            this.release(activeParticlesArray[i]);
        }
        activeParticlesArray.length = 0;
    }
};ParticlePool.initPool(particleGeometry, sparkMaterial);
