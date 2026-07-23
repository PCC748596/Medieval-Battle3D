// --- ÍNDICE O(1) DO POOL DE PARTÍCULAS ---
let _particlePoolFreeIndex = 0;

const geomBody = new THREE.BoxGeometry(1.2, 1.8, 0.8);
const geomHead = new THREE.BoxGeometry(0.8, 0.8, 0.8);

const geomUpper = new THREE.BoxGeometry(0.16, 0.65, 0.2);
geomUpper.translate(0, -0.325, 0);
const geomFore = new THREE.BoxGeometry(0.16, 0.2, 0.65);
geomFore.translate(0, -0.55, -0.225);
const geomArm = mergeBufferGeometries(geomUpper, geomFore);

const geomUpperL = new THREE.BoxGeometry(0.16, 0.2, 0.65);
geomUpperL.translate(0, -0.1, -0.325);
const geomForeL = new THREE.BoxGeometry(0.65, 0.2, 0.16);
geomForeL.translate(0.325, -0.1, -0.65);
const geomArmL = mergeBufferGeometries(geomUpperL, geomForeL);

const geomArmStraight = new THREE.BoxGeometry(0.16, 1.3, 0.2);
geomArmStraight.translate(0, -0.65, 0);

const geomLeg = new THREE.BoxGeometry(0.45, 0.6, 0.45);
geomLeg.translate(0, -0.3, 0);

const geomSwordBlade = new THREE.BoxGeometry(0.1, 1.5, 0.21);
const geomSwordHilt = new THREE.CylinderGeometry(0.07, 0.07, 0.42, 4);
const geomShield = new THREE.BoxGeometry(1.125, 1.75, 0.15);
const geomHelmet = new THREE.ConeGeometry(0.55, 0.55, 4);

const geomQuiver = new THREE.CylinderGeometry(0.18, 0.12, 1.0, 4);
const geomQuiverArrowShaft = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
const geomBowLimb = new THREE.BoxGeometry(0.1, 0.8, 0.16);
const geomBowGrip = new THREE.BoxGeometry(0.16, 0.32, 0.2);

const geomEye = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
const geomEar = new THREE.ConeGeometry(0.12, 0.45, 4);

const geomArrowShaft = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 4);
const geomArrowTip = new THREE.ConeGeometry(0.1, 0.3, 4);
const matArrowShaft = new THREE.MeshBasicMaterial({ color: 0x1a0a00 });
const matArrowTip = new THREE.MeshLambertMaterial({ color: 0x222222 });

const textures = {
    knights: {
        melee: generateProceduralTexture('knights', 'melee'),
        archer: generateProceduralTexture('knights', 'archer'),
        shield: generateShieldTexture('knights')
    },
    goblins: {
        melee: generateProceduralTexture('goblins', 'melee'),
        archer: generateProceduralTexture('goblins', 'archer'),
        shield: generateShieldTexture('goblins')
    }
};

const shieldMaterials = {
    knights: new THREE.MeshLambertMaterial({ map: textures.knights.shield }),
    goblins: new THREE.MeshLambertMaterial({ map: textures.goblins.shield })
};

const sharedBodyMaterials = {
    knights: {
        melee: new THREE.MeshLambertMaterial({ map: textures.knights.melee }),
        archer: new THREE.MeshLambertMaterial({ map: textures.knights.archer })
    },
    goblins: {
        melee: new THREE.MeshLambertMaterial({ map: textures.goblins.melee }),
        archer: new THREE.MeshLambertMaterial({ map: textures.goblins.archer })
    }
};

const templateMeshes = {
    knights: { melee: null, archer: null },
    goblins: { melee: null, archer: null }
};

// HUD.js - Módulo de interface de usuário
