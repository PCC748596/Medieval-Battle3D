// --- CONSTANTES GLOBAIS DE DIMENSÃO DA ARENA ---
let sizeX = 1000;
let sizeZ = 500;
let lodEnabled = true;
let currentTheme = 'medieval';

const boulders = [];
let rainPositions = null;
let rainVelocities = null;
let totalDeadKnights = 0;
let totalDeadGoblins = 0;
let cameraMode = 'orbit';
let cinematicTime = 0;
let cinematicZoomPauseTimer = 0;
let archerRatio = 0.3;
let flankRatio = 0.15;
let numCloudsSetting = 200;
let panelVisible = true;
let lightningTimer = 0;
let nextLightningTime = 0;
let flashCountdown = 0;
function isNapoleonicTheme() { return currentTheme === 'napoleonic' || currentTheme === 'napoleonic_3d'; }

// Guarda as coordenadas de todas as árvores ativas para verificar a proximidade de cobertura
const treePositions = [];
const treeData = [];
// Guarda as coordenadas de todos os troncos caídos (obstáculos intransponíveis)
const fallenLogs = [];

// --- FUNÇÃO MATEMÁTICA PROCEDURAL PARA AS ELEVAÇÕES DO TERRENO ---
function getTerrainHeight(x, z) {
    return Math.sin(x * 0.08) * Math.cos(z * 0.08) * 3.2 +
        Math.sin(x * 0.035) * 1.5 +
        Math.cos(z * 0.035) * 1.0;
}

const CONFIG = {
    // Battlefield
    BATTLEFIELD_START_X_RATIO: 0.38,
    BATTLEFIELD_MAX_Z_RATIO: 0.85,
    BATTLEFIELD_OBSTACLES_COUNT: 15,
    BATTLEFIELD_OBSTACLE_MIN_DIST_X: 10,
    BATTLEFIELD_OBSTACLE_MIN_DIST_Z: 10,
    BATTLEFIELD_OBSTACLE_EDGE_MARGIN: 25,
    LOG_MIN_LENGTH: 1.75,
    LOG_VAR_LENGTH: 1.5,
    ARENA_ASPECT_RATIO: 2.0, // Equivalente a 500 / 250
    FOG_DENSITY_MULTIPLIER: 1.125,

    // Units
    UNITS_COLS_PER_BLOCK: 10,
    UNITS_SPACING_X: 2.5,
    UNITS_SPACING_Z: 2.5,
    UNITS_BASE_GROUP_SPACING: 60,
    UNITS_ARCHER_GAP: 5.0,
    UNITS_CATAPULT_GAP: 8.0,

    // Catapults
    CATAPULT_MAX: 8,
    CATAPULT_OFFSET_NAPOLEONIC: 4.5,
    CATAPULT_OFFSET_MEDIEVAL: 3.4,
    CATAPULT_PUSHER_Z_OFFSET: 1.2,

    // Rain
    RAIN_CLOUD_THRESHOLD: 800,
    RAIN_COUNT: 15000,
    RAIN_DROP_SIZE: 0.04,
    RAIN_DROP_HEIGHT: 3.0,
    RAIN_OPACITY: 0.4,
    RAIN_AREA_SIZE: 1600,
    RAIN_START_Y: 200,
    RAIN_VAR_Y: 50,
    RAIN_MIN_VEL: 150,
    RAIN_VAR_VEL: 80,

    // Clouds
    CLOUD_MIN_BLOCKS: 4,
    CLOUD_VAR_BLOCKS: 5,
    CLOUD_MIN_SCALE_X: 20,
    CLOUD_VAR_SCALE_X: 60,
    CLOUD_MIN_SCALE_Y: 10,
    CLOUD_VAR_SCALE_Y: 30,
    CLOUD_MIN_SCALE_Z: 20,
    CLOUD_VAR_SCALE_Z: 60,
    CLOUD_OFFSET_XZ: 60,
    CLOUD_OFFSET_Y: 20,
    CLOUD_BASE_Y: 180,
    CLOUD_VAR_HEIGHT: 40,
    CLOUD_AREA_SIZE: 1600,
    CLOUD_WIND_MIN: 1,
    CLOUD_WIND_VAR: 5,

    // Camera
    CAMERA_THETA: 0.0,
    CAMERA_PHI: 0.1,
    CAMERA_RADIUS_RATIO: 0.8,

    // AI
    // Placeholder para constantes futuras

    // Animation
    // Placeholder para constantes futuras

    // Effects
    LIGHTNING_STORM_THRESHOLD: 900,
    LIGHTNING_MIN_TIME_STORM: 15,
    LIGHTNING_VAR_TIME_STORM: 10,
    LIGHTNING_MIN_TIME_NORMAL: 25,
    LIGHTNING_VAR_TIME_NORMAL: 10,
    LIGHTNING_MIN_DUR: 0.15,
    LIGHTNING_VAR_DUR: 0.2,
    LIGHTNING_FLASH_DIR_LIGHT: 5.0,
    LIGHTNING_FLASH_AMB_LIGHT: 2.5,
    LIGHTNING_DARK_DIR_LIGHT: 0.0,
    LIGHTNING_DARK_AMB_LIGHT: 0.2
};
// --- 1. SETUP DO AMBIENTE THREE.JS OPTIMIZADO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 1.125 / sizeX);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2500);

// Renderizador estável e otimizado para dispositivos móveis
const renderer = new THREE.WebGLRenderer({
    antialias: false,
    precision: "mediump"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);
// --- VECTORES REUTILIZÁVEIS PARA EVITAR ALOCAÇÕES POR FRAME ---
const _tmpVec3A = new THREE.Vector3();
const _tmpVec3B = new THREE.Vector3();
const _tmpVec3C = new THREE.Vector3();
const _tmpVec3D = new THREE.Vector3();
const _tmpVec3E = new THREE.Vector3();
const _axisY = new THREE.Vector3(0, 1, 0);

// --- 4. GERAÇÃO DE TEXTURAS COMPATÍVEIS (HTML CANVAS) ---
function generateProceduralTexture(faction, role) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const isArcher = (role === 'archer');

    if (faction === 'knights') {
        ctx.fillStyle = '#4c566a';
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#2e3440';
        ctx.lineWidth = 1;
        for (let i = 0; i < 64; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i, 0); ctx.lineTo(i, 64);
            ctx.moveTo(0, i); ctx.lineTo(64, i);
            ctx.stroke();
        }
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(5, 7, 54, 50);

        if (isArcher) {
            ctx.strokeStyle = '#5c3d2e';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(5, 7);
            ctx.lineTo(59, 57);
            ctx.stroke();
        }
    } else {
        ctx.fillStyle = '#5c7a43';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#4d6934';
        for (let i = 0; i < 15; i++) {
            ctx.fillRect(Math.random() * 50, Math.random() * 50, 6, 6);
        }
        ctx.fillStyle = '#5c3d2e';
        ctx.fillRect(7, 10, 50, 44);

        if (isArcher) {
            ctx.strokeStyle = '#211510';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(7, 7);
            ctx.lineTo(57, 57);
            ctx.stroke();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

function generateShieldTexture(faction) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (isNapoleonicTheme()) {
        if (faction === 'knights') {
            // Bandeira da França (Azul, Branco, Vermelho)
            ctx.fillStyle = '#0055A5';
            ctx.fillRect(0, 0, 21, 64);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(21, 0, 22, 64);
            ctx.fillStyle = '#EF4135';
            ctx.fillRect(43, 0, 21, 64);
        } else {
            // Bandeira Britânica (Union Jack simplificada)
            ctx.fillStyle = '#00247D';
            ctx.fillRect(0, 0, 64, 64);

            // Diagonais brancas
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(64, 64);
            ctx.moveTo(64, 0); ctx.lineTo(0, 64);
            ctx.stroke();

            // Diagonais vermelhas
            ctx.strokeStyle = '#CF142B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(64, 64);
            ctx.moveTo(64, 0); ctx.lineTo(0, 64);
            ctx.stroke();

            // Cruz branca
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(24, 0, 16, 64);
            ctx.fillRect(0, 24, 64, 16);

            // Cruz vermelha
            ctx.fillStyle = '#CF142B';
            ctx.fillRect(28, 0, 8, 64);
            ctx.fillRect(0, 28, 64, 8);
        }
    } else {
        if (faction === 'knights') {
            ctx.fillStyle = '#1b2a4a';
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(28, 5, 8, 54);
            ctx.fillRect(5, 28, 54, 8);
        } else {
            ctx.fillStyle = '#6e3e15';
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = '#4a2507';
            ctx.fillRect(0, 12, 64, 5);
            ctx.fillRect(0, 30, 64, 6);
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 5;
            ctx.strokeRect(8, 8, 48, 48);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// --- Helper para fundir geometrias ---
function mergeBufferGeometries(geo1, geo2) {
    const position1 = geo1.attributes.position.array;
    const position2 = geo2.attributes.position.array;
    const normal1 = geo1.attributes.normal.array;
    const normal2 = geo2.attributes.normal.array;

    const combinedPositions = new Float32Array(position1.length + position2.length);
    combinedPositions.set(position1);
    combinedPositions.set(position2, position1.length);

    const combinedNormals = new Float32Array(normal1.length + normal2.length);
    combinedNormals.set(normal1);
    combinedNormals.set(normal2, normal1.length);

    const index1 = geo1.index ? geo1.index.array : null;
    const index2 = geo2.index ? geo2.index.array : null;

    const mergedGeo = new THREE.BufferGeometry();
    mergedGeo.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));
    mergedGeo.setAttribute('normal', new THREE.BufferAttribute(combinedNormals, 3));

    if (index1 && index2) {
        const combinedIndices = new Uint16Array(index1.length + index2.length);
        combinedIndices.set(index1);
        const offset = position1.length / 3;
        for (let i = 0; i < index2.length; i++) {
            combinedIndices[index1.length + i] = index2[i] + offset;
        }
        mergedGeo.setIndex(new THREE.BufferAttribute(combinedIndices, 1));
    }
    return mergedGeo;
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

function mergeGroupToMesh(group, faction) {
    const geos = [];
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

    if (geos.length === 0) return group;

    const mergedGeometry = mergeGeometries(geos);
    const mergedMaterial = new THREE.MeshLambertMaterial({
        vertexColors: true
    });

    const highDetailMesh = new THREE.Mesh(mergedGeometry, mergedMaterial);
    highDetailMesh.name = "highDetail";
    highDetailMesh.castShadow = true;
    highDetailMesh.receiveShadow = true;

    const container = new THREE.Group();
    container.name = "mergedWarrior";
    container.add(highDetailMesh);

    const lodPrimitive = group.getObjectByName('lodPrimitive');
    if (lodPrimitive) {
        const clonedLod = lodPrimitive.clone();
        clonedLod.visible = false;
        container.add(clonedLod);
    }

    return container;
}

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

const geomArrowShaft = new THREE.CylinderGeometry(0.035, 0.035, 1.1, 4);
const geomArrowTip = new THREE.ConeGeometry(0.07, 0.22, 4);
const matArrowShaft = new THREE.MeshBasicMaterial({ color: 0xffffff });
const matArrowTip = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });

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

let napoleonicSoldierGLTF = null;
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load('assets/Toy_Soldier_0720141626_texture.glb', (gltf) => {
    napoleonicSoldierGLTF = gltf.scene;
    napoleonicSoldierGLTF.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}, undefined, (err) => {
    console.warn('Modelo 3D do soldado napoleónico não encontrado, usando fallback geométrico.');
});
// HUD.js - Módulo de interface de usuário

const HUD = {
    elements: {},

    init() {
        this.elements = {
            countKills: document.getElementById('count-kills'),
            countKnights: document.getElementById('count-knights'),
            countGoblins: document.getElementById('count-goblins'),
            fpsCounter: document.getElementById('fps-counter'),
            
            panel: document.getElementById('control-panel'),
            toggleBtn: document.getElementById('floating-toggle-btn'),
            
            btnPause: document.getElementById('btn-pause'),
            pauseIcon: document.getElementById('pause-icon'),
            pauseText: document.getElementById('pause-text'),
            
            btnSound: document.getElementById('btn-sound'),
            
            battleEndModal: document.getElementById('battle-end-modal'),
            winnerTitle: document.getElementById('winner-title'),
            lossKnights: document.getElementById('loss-knights'),
            lossGoblins: document.getElementById('loss-goblins'),
            
            speedVal: document.getElementById('speed-val'),
            cloudsVal: document.getElementById('clouds-val'),
            
            labelKnights: document.getElementById('label-knights'),
            labelGoblins: document.getElementById('label-goblins'),
            btnReinfKnights: document.getElementById('btn-reinf-knights'),
            btnReinfGoblins: document.getElementById('btn-reinf-goblins'),
            
            tabletZoomControls: document.getElementById('tablet-zoom-controls'),
            
            toggleLogs: document.getElementById('toggle-logs'),
            unitsSlider: document.getElementById('units-slider'),
            flankSelect: document.getElementById('flank-ratio-select'),
            cloudsSlider: document.getElementById('clouds-slider'),
            archerSlider: document.getElementById('archer-ratio-slider'),
            arenaSlider: document.getElementById('arena-slider'),
            speedSlider: document.getElementById('speed-slider'),
            
            loader: document.getElementById('loader'),
            loaderText: document.getElementById('loader-text')
        };
    },

    updateKills(kills) {
        if (this.elements.countKills) this.elements.countKills.innerText = kills;
    },

    updateArmy(faction, count) {
        const el = faction === 'knights' ? this.elements.countKnights : this.elements.countGoblins;
        if (el) {
            el.innerText = count;
        }
    },

    updateArmyCounts(knightsCount, goblinsCount) {
        this.updateArmy('knights', knightsCount);
        this.updateArmy('goblins', goblinsCount);
    },

    updatePause(isPaused) {
        if (!this.elements.btnPause) return;
        if (isPaused) {
            this.elements.btnPause.className = "py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-xs font-black rounded-lg transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95";
            if (this.elements.pauseIcon) this.elements.pauseIcon.innerText = "▶️";
            if (this.elements.pauseText) this.elements.pauseText.innerText = "Continuar";
        } else {
            this.elements.btnPause.className = "py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-xs font-black rounded-lg transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95";
            if (this.elements.pauseIcon) this.elements.pauseIcon.innerText = "⏸️";
            if (this.elements.pauseText) this.elements.pauseText.innerText = "Pausar";
        }
    },

    updateAudioBtn(soundEnabled) {
        if (!this.elements.btnSound) return;
        if (soundEnabled) {
            this.elements.btnSound.className = "w-full py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 transition-all flex items-center justify-center gap-2";
            this.elements.btnSound.innerHTML = `<span id="sound-icon">🔊</span> Som Ativado`;
        } else {
            this.elements.btnSound.className = "w-full py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all flex items-center justify-center gap-2";
            this.elements.btnSound.innerHTML = `<span id="sound-icon">🔇</span> Som Desativado`;
        }
    },

    updateWeather(type) {
        document.querySelectorAll('.env-btn').forEach(b => b.className = "env-btn px-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all flex flex-col items-center gap-0.5");
        const activeBtn = document.getElementById(`btn-env-${type}`);
        if (activeBtn) {
            activeBtn.className = "env-btn px-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all flex flex-col items-center gap-0.5";
        }
    },

    updateTheme(theme, nameKnights, nameGoblins) {
        document.querySelectorAll('.theme-btn').forEach(b => {
            b.className = "theme-btn py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all flex flex-col items-center gap-0.5";
        });
        const activeBtn = document.getElementById(`btn-theme-${theme}`);
        if (activeBtn) {
            activeBtn.className = "theme-btn py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex flex-col items-center gap-0.5";
        }
        
        if (this.elements.labelKnights) this.elements.labelKnights.innerText = nameKnights;
        if (this.elements.labelGoblins) this.elements.labelGoblins.innerText = nameGoblins;
        if (this.elements.btnReinfKnights) this.elements.btnReinfKnights.innerHTML = `➕ 50 ${nameKnights}`;
        if (this.elements.btnReinfGoblins) this.elements.btnReinfGoblins.innerHTML = `➕ 50 ${nameGoblins}`;
    },
    
    updateCameraBtn(mode) {
        document.querySelectorAll('.cam-btn').forEach(b => b.className = "cam-btn py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all");
        const activeBtn = document.getElementById(`btn-cam-${mode}`);
        if (activeBtn) {
            activeBtn.className = "cam-btn py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all";
        }
        if (mode === 'rts' || mode === 'isometric') {
            if (this.elements.tabletZoomControls) this.elements.tabletZoomControls.style.display = 'flex';
        } else {
            if (this.elements.tabletZoomControls) this.elements.tabletZoomControls.style.display = 'none';
        }
    },
    
    updateSettingsVisibility(isVisible) {
        if (!this.elements.panel) return;
        if (isVisible) {
            this.elements.panel.style.transform = 'translateY(0) scale(1)';
            this.elements.panel.style.opacity = '1';
            this.elements.panel.style.pointerEvents = 'auto';
            if (this.elements.toggleBtn) this.elements.toggleBtn.innerHTML = '🙈 Ocultar Controles';
        } else {
            this.elements.panel.style.transform = 'translateY(50px) scale(0.9)';
            this.elements.panel.style.opacity = '0';
            this.elements.panel.style.pointerEvents = 'none';
            if (this.elements.toggleBtn) this.elements.toggleBtn.innerHTML = '🛠️ Ajustes';
        }
    },
    
    updateSliderValue(sliderId, valStr) {
        const el = document.getElementById(`${sliderId}-val`);
        if (el) el.innerText = valStr;
    },
    
    showBattleEndModal(winnerFaction, deadKnights, deadGoblins, nameKnights, nameGoblins) {
        if (this.elements.winnerTitle) {
            if (winnerFaction === 'knights') {
                this.elements.winnerTitle.innerText = `Vitória: ${nameKnights}!`;
                this.elements.winnerTitle.className = "text-2xl font-black text-blue-500 mb-2 tracking-wide uppercase text-center";
            } else if (winnerFaction === 'goblins') {
                this.elements.winnerTitle.innerText = `Vitória: ${nameGoblins}!`;
                this.elements.winnerTitle.className = "text-2xl font-black text-red-500 mb-2 tracking-wide uppercase text-center";
            } else {
                this.elements.winnerTitle.innerText = "Empate!";
                this.elements.winnerTitle.className = "text-2xl font-black text-amber-500 mb-2 tracking-wide uppercase text-center";
            }
        }
        if (this.elements.lossKnights) this.elements.lossKnights.innerText = deadKnights;
        if (this.elements.lossGoblins) this.elements.lossGoblins.innerText = deadGoblins;
        if (this.elements.battleEndModal) this.elements.battleEndModal.classList.remove('hidden');
    },
    
    hideBattleEndModal() {
        if (this.elements.battleEndModal) this.elements.battleEndModal.classList.add('hidden');
    },
    
    updateFPS(fps) {
        if (this.elements.fpsCounter) this.elements.fpsCounter.innerText = `${fps} FPS`;
    },
    
    showLoaderError(msg) {
        if (this.elements.loaderText) {
            this.elements.loaderText.innerHTML = `Erro ao iniciar: ${msg}<br><span class='text-xs text-slate-400'>Por favor, recarregue a página.</span>`;
        }
    },
    
    hideLoader() {
        if (this.elements.loader) this.elements.loader.style.opacity = '0';
        setTimeout(() => {
            if (this.elements.loader) this.elements.loader.style.display = 'none';
        }, 500);
    },
    
    isToggleLogsChecked() {
        return this.elements.toggleLogs ? this.elements.toggleLogs.checked : false;
    },
    
    getUnitsSliderValue() {
        return this.elements.unitsSlider ? parseInt(this.elements.unitsSlider.value) : 0;
    },
    
    setCloudsSliderValue(val) {
        if (this.elements.cloudsSlider) this.elements.cloudsSlider.value = val;
    },
    
    setupListeners(callbacks) {
        if (this.elements.unitsSlider) {
            this.elements.unitsSlider.addEventListener('input', (e) => callbacks.onUnitsChange(e.target.value));
        }
        if (this.elements.flankSelect) {
            this.elements.flankSelect.addEventListener('change', (e) => callbacks.onFlankChange(e.target.value));
        }
        if (this.elements.cloudsSlider) {
            this.elements.cloudsSlider.addEventListener('input', (e) => callbacks.onCloudsChange(e.target.value));
        }
        if (this.elements.archerSlider) {
            this.elements.archerSlider.addEventListener('input', (e) => callbacks.onArcherChange(e.target.value));
        }
        if (this.elements.arenaSlider) {
            this.elements.arenaSlider.addEventListener('input', (e) => callbacks.onArenaInput(e.target.value));
            this.elements.arenaSlider.addEventListener('change', (e) => callbacks.onArenaChange(e.target.value));
        }
        if (this.elements.speedSlider) {
            this.elements.speedSlider.addEventListener('input', (e) => callbacks.onSpeedChange(e.target.value));
        }
    }
};

window.HUD = HUD;
// --- 6. GEOMETRIA BASE DOS BONECOS ---
const steelMaterial = new THREE.MeshLambertMaterial({ color: 0xd8dee9 });
const woodMaterial = new THREE.MeshLambertMaterial({ color: 0x815a3c });
const skinFleshMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
const skinGreenMat = new THREE.MeshLambertMaterial({ color: 0x6b8e23 });
const hitFlashMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333 });
const quiverMaterial = new THREE.MeshLambertMaterial({ color: 0x5c4033 });

// --- MATERIAIS E GEOMETRIAS DAS CATAPULTAS ---
const catapultWoodMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
const catapultDarkWoodMat = new THREE.MeshLambertMaterial({ color: 0x3b2410 });
const catapultMetalMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
const boulderGeo = new THREE.IcosahedronGeometry(0.8, 1);
const boulderMat = new THREE.MeshLambertMaterial({ color: 0x555555 });

const lodGeoCube = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const lodGeoCircle = new THREE.CylinderGeometry(1.2, 1.2, 0.4, 8);
const lodGeoCatapult = new THREE.BoxGeometry(8, 4, 10);
const lodBlueMat = new THREE.MeshLambertMaterial({ color: 0x2255ff });
const lodGreenMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const lodBrownMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
const fireBoulderMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
const impactFlashMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

// --- REFS DOM CACHEADAS REMOVIDAS (Agora no HUD) ---

// --- 5. MONTAGEM DA ARENA COM ELEVAÇÕES ---
const grassTexture = generateProceduralTexture('knights', 'melee'); // Textura de preenchimento básica caso falhe
const wallMat = new THREE.MeshLambertMaterial({ color: 0x5d6167 });

// Gera relva processada
const groundCanvas = document.createElement('canvas');
groundCanvas.width = 128;
groundCanvas.height = 128;
const gCtx = groundCanvas.getContext('2d');
gCtx.fillStyle = '#4c8c35';
gCtx.fillRect(0, 0, 128, 128);
for (let i = 0; i < 500; i++) {
    gCtx.fillStyle = Math.random() > 0.5 ? '#3b7027' : '#5db341';
    gCtx.fillRect(Math.random() * 128, Math.random() * 128, 3, 3);
}
const grassTextureReal = new THREE.CanvasTexture(groundCanvas);
grassTextureReal.wrapS = THREE.RepeatWrapping;
grassTextureReal.wrapT = THREE.RepeatWrapping;
grassTextureReal.repeat.set(12, 12);

const groundMat = new THREE.MeshLambertMaterial({ map: grassTextureReal, vertexColors: true });
let frameCount = 0;
const lakes = [];
const muds = [];
const clouds = [];
let cloudInstancedMesh;
let rainMesh;
let isRaining = false;
let ground;
const arenaWalls = [];
const treeMeshes = [];

// Muralhas
const buildArenaWall = (w, h, d, x, y, z, rotY) => {
    const box = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(box, wallMat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY || 0;
    scene.add(mesh);
    arenaWalls.push(mesh);
};

let treeTrunkInstanced, treeLeaves1Instanced, treeLeaves2Instanced, treeLeaves3Instanced;
function clearArena() {
    arenaWalls.forEach(wall => {
        scene.remove(wall);
        wall.geometry.dispose();
    });
    arenaWalls.length = 0;

    if (treeTrunkInstanced) { scene.remove(treeTrunkInstanced); treeTrunkInstanced.dispose(); treeTrunkInstanced = null; }
    if (treeLeaves1Instanced) { scene.remove(treeLeaves1Instanced); treeLeaves1Instanced.dispose(); treeLeaves1Instanced = null; }
    if (treeLeaves2Instanced) { scene.remove(treeLeaves2Instanced); treeLeaves2Instanced.dispose(); treeLeaves2Instanced = null; }
    if (treeLeaves3Instanced) { scene.remove(treeLeaves3Instanced); treeLeaves3Instanced.dispose(); treeLeaves3Instanced = null; }

    treeMeshes.length = 0;
    treePositions.length = 0;
    treeData.length = 0;

    if (ground) {
        scene.remove(ground);
        ground.geometry.dispose();
    }
}

function buildArena() {
    const groundGeo = new THREE.PlaneGeometry(1000, 1000, 128, 128);
    const posAttr = groundGeo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);

    // Geração de lagos (mais lagos, menores, nas partes baixas)
    lakes.length = 0;
    const numLakes = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numLakes; i++) {
        let lx, lz, attempts = 0;
        do {
            lx = (Math.random() - 0.5) * 800;
            lz = (Math.random() - 0.5) * 400;
            attempts++;
        } while (getTerrainHeight(lx, lz) > -0.5 && attempts < 50);

        lakes.push({
            x: lx,
            z: lz,
            r: 8 + Math.random() * 7
        });
    }

    // Geração de lama (mais lamas, menores)
    muds.length = 0;
    const numMuds = 10 + Math.floor(Math.random() * 9);
    for (let i = 0; i < numMuds; i++) {
        muds.push({
            x: (Math.random() - 0.5) * 800,
            z: (Math.random() - 0.5) * 400,
            r: 10 + Math.random() * 10
        });
    }

    for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const height = getTerrainHeight(vx, -vy);
        posAttr.setZ(i, height);

        // A cor base da relva é branca (a textura cuida do verde)
        let r = 1.0, g = 1.0, b = 1.0;

        // Verifica se está dentro de lama
        for (let j = 0; j < muds.length; j++) {
            const dx = vx - muds[j].x;
            const dz = -vy - muds[j].z;
            if (dx * dx + dz * dz < muds[j].r * muds[j].r) {
                // Castanho escuro para lama
                r = 0.4; g = 0.25; b = 0.1;
                break;
            }
        }

        // Verifica se está dentro de lago (sobrepõe lama)
        for (let j = 0; j < lakes.length; j++) {
            const dx = vx - lakes[j].x;
            const dz = -vy - lakes[j].z;
            if (dx * dx + dz * dz < lakes[j].r * lakes[j].r) {
                // Azul para lago
                r = 0.2; g = 0.4; b = 0.8;
                break;
            }
        }

        colorAttr[i * 3] = r;
        colorAttr[i * 3 + 1] = g;
        colorAttr[i * 3 + 2] = b;
    }

    groundGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    groundGeo.computeVertexNormals();

    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    buildStoneWallPerimeter();
}

// --- GERADOR DE MURALHA DE PEDRA (BORDAS DO MAPA) ---
function buildStoneWallPerimeter() {
    // O terreno visual tem 1000x1000
    const halfX = 1000 / 2;
    const halfZ = 1000 / 2;
    const wallGeo = new THREE.DodecahedronGeometry(1, 0); 
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x7c8185, flatShading: true });
    
    const positions = [];
    const step = 30; // Distância maior para o fim do mapa
    
    for (let x = -halfX; x <= halfX; x += step) {
        positions.push({ x: x, z: -halfZ });
        positions.push({ x: x, z: halfZ });
    }
    for (let z = -halfZ; z <= halfZ; z += step) {
        positions.push({ x: -halfX, z: z });
        positions.push({ x: halfX, z: z });
    }
    
    const instancedWall = new THREE.InstancedMesh(wallGeo, wallMat, positions.length * 3);
    let idx = 0;
    const dummy = new THREE.Object3D();
    
    for (const pos of positions) {
        const numBlocks = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numBlocks; i++) {
            const rWidth = 25 + Math.random() * 20; // Blocos bem maiores
            const rHeight = 50 + Math.random() * 40; 
            const rDepth = 25 + Math.random() * 20;
            
            dummy.position.set(
                pos.x + (Math.random() - 0.5) * 15,
                getTerrainHeight(pos.x, pos.z) + rHeight / 2 - 15,
                pos.z + (Math.random() - 0.5) * 15
            );
            dummy.scale.set(rWidth, rHeight, rDepth);
            dummy.rotation.set(
                (Math.random() - 0.5) * 0.1, 
                Math.random() * Math.PI, 
                (Math.random() - 0.5) * 0.1
            );
            dummy.updateMatrix();
            instancedWall.setMatrixAt(idx++, dummy.matrix);
        }
    }
    
    instancedWall.count = idx;
    instancedWall.castShadow = false; // DESABILITADO PARA PERFORMANCE
    instancedWall.receiveShadow = true;
    scene.add(instancedWall);
    arenaWalls.push(instancedWall);
}

function finalizeTrees() {
    const numTrees = treeData.length;
    if (numTrees === 0) return;

    let totalTrunks = 0;
    let totalLeaves = 0;

    for (let i = 0; i < numTrees; i++) {
        const type = treeData[i].type;
        totalTrunks += treeTypes[type].trunks.length;
        totalLeaves += treeTypes[type].leaves.length;
    }

    treeTrunkInstanced = new THREE.InstancedMesh(treeTrunkGeo, woodMat, totalTrunks);
    treeLeaves1Instanced = new THREE.InstancedMesh(treeLeavesGeo, leavesMat, totalLeaves); // We reuse treeLeaves1Instanced variable

    treeTrunkInstanced.matrixAutoUpdate = false;
    treeLeaves1Instanced.matrixAutoUpdate = false;

    const dummy = new THREE.Object3D();
    const baseMatrix = new THREE.Matrix4();
    const localMatrix = new THREE.Matrix4();

    const leafPalette = [
        new THREE.Color(0x4ea640), // vibrant green
        new THREE.Color(0x3a822b), // medium green
        new THREE.Color(0x28631b), // dark green
        new THREE.Color(0x6b8e23), // olive green
        new THREE.Color(0x8cb036), // yellowish green
        new THREE.Color(0x9ca828)  // yellow-green
    ];

    let trunkIdx = 0;
    let leafIdx = 0;

    for (let i = 0; i < numTrees; i++) {
        const data = treeData[i];
        const scale = data.scale;
        const type = data.type;
        const structure = treeTypes[type];

        // Create base matrix for this tree
        baseMatrix.makeTranslation(data.x, data.y, data.z);
        baseMatrix.multiply(new THREE.Matrix4().makeRotationY(data.rotY));
        baseMatrix.scale(new THREE.Vector3(scale, scale, scale));

        // Add trunks
        for (const t of structure.trunks) {
            dummy.position.set(...t.pos);
            dummy.rotation.set(...t.rot);
            dummy.scale.set(...t.scale);
            dummy.updateMatrix();
            localMatrix.copy(baseMatrix).multiply(dummy.matrix);
            treeTrunkInstanced.setMatrixAt(trunkIdx++, localMatrix);
        }

        // Add leaves
        for (const l of structure.leaves) {
            dummy.position.set(...l.pos);
            dummy.rotation.set(0, Math.random() * Math.PI, 0); // Random leaf rotation for variety
            dummy.scale.set(...l.scale);
            dummy.updateMatrix();
            localMatrix.copy(baseMatrix).multiply(dummy.matrix);
            treeLeaves1Instanced.setMatrixAt(leafIdx, localMatrix);
            
            // Randomly select a color from the palette for this leaf cluster
            const randomColor = leafPalette[Math.floor(Math.random() * leafPalette.length)];
            treeLeaves1Instanced.setColorAt(leafIdx, randomColor);
            
            leafIdx++;
        }
    }

    if (totalLeaves > 0) {
        treeLeaves1Instanced.instanceColor.needsUpdate = true;
    }

    treeTrunkInstanced.castShadow = false; // DESABILITADO PARA PERFORMANCE
    treeTrunkInstanced.receiveShadow = true;
    treeLeaves1Instanced.castShadow = false; // DESABILITADO PARA PERFORMANCE
    treeLeaves1Instanced.receiveShadow = true;

    scene.add(treeTrunkInstanced);
    scene.add(treeLeaves1Instanced);
}

function spawnTrees() {
    const numTrees = 3000;
    const safeZoneX = sizeX / 2 + 20;
    const safeZoneZ = sizeZ / 2 + 20;

    for (let i = 0; i < numTrees; i++) {
        const treeX = (Math.random() - 0.5) * 1000;
        const treeZ = (Math.random() - 0.5) * 1000;

        // Evita área central onde a batalha ocorre para não poluir
        if (Math.abs(treeX) > safeZoneX || Math.abs(treeZ) > safeZoneZ) {
            spawnTree(treeX, treeZ);
        } else {
            // Mais árvores espalhadas dentro da arena
            if (Math.random() > 0.70) {
                spawnTree(treeX, treeZ);
            }
        }
    }
    finalizeTrees();
}

const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, flatShading: true, roughness: 0.9, metalness: 0.1 });
const leavesMat = new THREE.MeshStandardMaterial({ color: 0x4ea640, flatShading: true, roughness: 0.8, metalness: 0.1 }); // Vibrant green

const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 5);
treeTrunkGeo.translate(0, 1.5, 0); // Origin at bottom

const treeLeavesGeo = new THREE.IcosahedronGeometry(1.5, 0);

// Define structures for the 3 tree types
const treeTypes = [
    // Type 0: Dead tree (only trunks/branches)
    {
        trunks: [
            { pos: [0, 0, 0], scale: [1.2, 1.2, 1.2], rot: [0.1, 0, 0.1] },
            { pos: [-0.3, 3.5, 0.3], scale: [0.8, 1.0, 0.8], rot: [-0.2, 0, -0.2] },
            { pos: [0.3, 6.3, -0.2], scale: [0.5, 0.8, 0.5], rot: [0.3, 0, 0.1] },
            { pos: [-0.2, 2.5, 0.2], scale: [0.4, 0.8, 0.4], rot: [-0.6, 0.5, 0.2] },
            { pos: [-0.4, 5.0, 0.2], scale: [0.3, 0.7, 0.3], rot: [0.2, -0.5, -0.8] },
            { pos: [0.2, 6.0, -0.1], scale: [0.2, 0.6, 0.2], rot: [-0.3, 0.2, 0.6] }
        ],
        leaves: []
    },
    // Type 1: Medium tree
    {
        trunks: [
            { pos: [0, 0, 0], scale: [1.2, 1.2, 1.2], rot: [0.1, 0, 0.1] },
            { pos: [-0.3, 3.5, 0.3], scale: [0.8, 1.0, 0.8], rot: [-0.2, 0, -0.2] },
            { pos: [0.3, 6.3, -0.2], scale: [0.5, 0.8, 0.5], rot: [0.3, 0, 0.1] },
            { pos: [-0.2, 2.5, 0.2], scale: [0.4, 0.8, 0.4], rot: [-0.6, 0.5, 0.2] },
            { pos: [-0.4, 5.0, 0.2], scale: [0.3, 0.7, 0.3], rot: [0.2, -0.5, -0.8] },
            { pos: [0.2, 6.0, -0.1], scale: [0.2, 0.6, 0.2], rot: [-0.3, 0.2, 0.6] }
        ],
        leaves: [
            { pos: [0.8, 8.5, 0], scale: [1.4, 1.2, 1.4] },
            { pos: [-1.2, 4.5, 1.0], scale: [1.1, 1.0, 1.1] },
            { pos: [-1.5, 6.5, -0.5], scale: [1.2, 1.1, 1.2] },
            { pos: [1.0, 7.5, 0.8], scale: [1.0, 1.0, 1.0] }
        ]
    },
    // Type 2: Full tree
    {
        trunks: [
            { pos: [0, 0, 0], scale: [1.2, 1.2, 1.2], rot: [0.1, 0, 0.1] },
            { pos: [-0.3, 3.5, 0.3], scale: [0.8, 1.0, 0.8], rot: [-0.2, 0, -0.2] },
            { pos: [0.3, 6.3, -0.2], scale: [0.5, 0.8, 0.5], rot: [0.3, 0, 0.1] },
            { pos: [-0.2, 2.5, 0.2], scale: [0.4, 0.8, 0.4], rot: [-0.6, 0.5, 0.2] },
            { pos: [-0.4, 5.0, 0.2], scale: [0.3, 0.7, 0.3], rot: [0.2, -0.5, -0.8] },
            { pos: [0.2, 6.0, -0.1], scale: [0.2, 0.6, 0.2], rot: [-0.3, 0.2, 0.6] }
        ],
        leaves: [
            { pos: [0.8, 8.5, 0], scale: [1.6, 1.4, 1.6] },
            { pos: [-1.2, 4.5, 1.0], scale: [1.4, 1.3, 1.4] },
            { pos: [-1.5, 6.5, -0.5], scale: [1.5, 1.4, 1.5] },
            { pos: [1.0, 7.5, 0.8], scale: [1.3, 1.2, 1.3] },
            { pos: [-0.5, 7.5, 1.2], scale: [1.5, 1.3, 1.5] },
            { pos: [1.5, 6.5, -0.5], scale: [1.4, 1.3, 1.4] },
            { pos: [0, 10.0, -0.5], scale: [1.2, 1.1, 1.2] }
        ]
    }
];

function spawnTree(x, z) {
    const terrainY = getTerrainHeight(x, z);
    const scale = 0.8 + Math.random() * 0.4;
    const rotY = Math.random() * Math.PI * 2;
    // 10% dead, 40% medium, 50% full
    const r = Math.random();
    const type = r < 0.1 ? 0 : (r < 0.5 ? 1 : 2);
    treeData.push({ x, y: terrainY, z, scale, rotY, type });
    treePositions.push(new THREE.Vector3(x, terrainY, z));
}

// --- GERADOR DE OBSTÁCULOS (PEDRAS E TRONCOS) ---
function spawnObstacle(x, z) {
    const obsGroup = new THREE.Group();
    const type = Math.random() > 0.5 ? 'rock' : 'stump';
    
    // Raio base para colisão
    const radius = 1.0 + Math.random() * 1.0; 
    const terrainY = getTerrainHeight(x, z);
    
    if (type === 'rock') {
        const rockMat = new THREE.MeshLambertMaterial({ color: 0x888888, flatShading: true });
        const numRocks = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numRocks; i++) {
            const rRadius = (radius * 0.4) + Math.random() * (radius * 0.4);
            const rockGeo = new THREE.DodecahedronGeometry(rRadius, 0);
            const rockMesh = new THREE.Mesh(rockGeo, rockMat);
            
            // Posiciona em volta do centro
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (radius * 0.6);
            rockMesh.position.set(
                Math.cos(angle) * dist, 
                rRadius * 0.4, 
                Math.sin(angle) * dist
            );
            
            rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            rockMesh.scale.set(1, 0.6 + Math.random() * 0.5, 1);
            obsGroup.add(rockMesh);
        }
    } else {
        const stumpMat = new THREE.MeshLambertMaterial({ color: 0x5c4033, flatShading: true });
        const height = 0.8 + Math.random() * 0.6;
        // Tronco low poly (6 ou 7 lados)
        const stumpGeo = new THREE.CylinderGeometry(radius * 0.7, radius, height, 6);
        const stumpMesh = new THREE.Mesh(stumpGeo, stumpMat);
        stumpMesh.position.y = height / 2;
        
        // Raiz simples
        if (Math.random() > 0.5) {
            const rootGeo = new THREE.BoxGeometry(radius * 0.6, height * 0.6, radius * 1.5);
            const rootMesh = new THREE.Mesh(rootGeo, stumpMat);
            rootMesh.position.y = height * 0.3;
            rootMesh.rotation.y = Math.random() * Math.PI;
            obsGroup.add(rootMesh);
        }
        
        obsGroup.add(stumpMesh);
    }
    
    obsGroup.position.set(x, terrainY, z);
    // Rotação aleatória pro grupo
    obsGroup.rotation.y = Math.random() * Math.PI * 2;
    scene.add(obsGroup);
    
    // Adicionar à lista de colisões (com um length minúsculo para evitar erro de divisão por zero no warrior.js)
    fallenLogs.push({
        mesh: obsGroup,
        x: x,
        z: z,
        y: terrainY,
        radius: radius,
        length: 0.1, 
        ax: x - 0.05,
        az: z,
        bx: x + 0.05,
        bz: z,
        dirX: 1,
        dirZ: 0
    });
}
// --- 3. ILUMINAÇÃO & AMBIENTES ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(100, 300, 100);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 1000;
dirLight.shadow.camera.left = -500;
dirLight.shadow.camera.right = 500;
dirLight.shadow.camera.top = 500;
dirLight.shadow.camera.bottom = -500;
dirLight.shadow.camera.updateProjectionMatrix();
scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
rimLight.position.set(-20, 10, -10);
scene.add(rimLight);

let currentEnv = 'dia';
function setEnvironment(type) {
    currentEnv = type;
    HUD.updateWeather(type);

    if (type === 'dia') {
        scene.background.setHex(0x87CEEB);
        scene.fog.color.setHex(0x87CEEB);
        ambientLight.color.setHex(0xffffff);
        ambientLight.intensity = 0.9;
        dirLight.color.setHex(0xfffaf0);
        dirLight.intensity = 1.2;
        rimLight.color.setHex(0xffffff);
        rimLight.intensity = 0.3;
    } else if (type === 'sunset') {
        scene.background.setHex(0x381e18);
        scene.fog.color.setHex(0x381e18);
        ambientLight.color.setHex(0xff9977);
        ambientLight.intensity = 0.45;
        dirLight.color.setHex(0xff5522);
        dirLight.intensity = 0.8;
        rimLight.color.setHex(0xaa33ff);
        rimLight.intensity = 0.45;
    } else if (type === 'noite') {
        scene.background.setHex(0x07090e);
        scene.fog.color.setHex(0x07090e);
        ambientLight.color.setHex(0x445577);
        ambientLight.intensity = 0.45;
        dirLight.color.setHex(0x77aaff);
        dirLight.intensity = 0.8;
        rimLight.color.setHex(0xddddff);
        rimLight.intensity = 0.4;
    }

    // Escurece o ambiente de acordo com a quantidade de nuvens
    const cloudFactor = (typeof numCloudsSetting !== 'undefined' ? numCloudsSetting : 200) / 1000.0;
    dirLight.intensity *= (1.0 - cloudFactor * 0.85);
    ambientLight.intensity *= (1.0 - cloudFactor * 0.5);
}
window.setEnvironment = setEnvironment;
// --- 2. ÁUDIO DO JOGO ---
let audioCtx = null;
let soundEnabled = false;

const bgMusic = new Audio("assets/sounds/tribe-drum-loop.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.45;

const warCryMusic = new Audio("assets/sounds/battle-warrior-fighting-drums-478210.mp3");
warCryMusic.volume = 0.5;

function createAudioPool(src, size, baseVol = 0.3) {
    const pool = [];
    for (let i = 0; i < size; i++) {
        const audio = new Audio(src);
        audio.volume = baseVol;
        pool.push(audio);
    }
    let idx = 0;
    return {
        play: (volMultiplier = 1.0) => {
            if (!soundEnabled) return;
            const audio = pool[idx];
            audio.volume = baseVol * volMultiplier;
            audio.currentTime = 0;
            audio.play().catch(e => {});
            idx = (idx + 1) % size;
        }
    };
}

const swordPool = createAudioPool("assets/sounds/sword.mp3", 15, 0.4);
const arrowPool = createAudioPool("assets/sounds/arrow-swish.mp3", 10, 0.3);

window.toggleAudio = function () {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
        HUD.updateAudioBtn(true);
        if (!battleManager.isPaused()) {
            bgMusic.play().catch(e => { });
        }
    } else {
        HUD.updateAudioBtn(false);
        bgMusic.pause();
        warCryMusic.pause();
    }
};

function playClangSound(intensity) {
    if (!soundEnabled) return;
    swordPool.play(0.5 + intensity * 0.5);
}

function playArrowReleaseSound() {
    if (!soundEnabled) return;
    arrowPool.play(1.0);
}

function playDeathSound() {
    // Optionally synthesized or omitted
}

function playWarCrySound() {
    if (!soundEnabled) return;
    warCryMusic.currentTime = 0;
    warCryMusic.play().catch(e => {});
}

function startContinuousCrowdRoar() {}
function stopContinuousCrowdRoar() {}
function startDrumLoop() {}
function stopDrumLoop() {}
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

// --- CALCULA DISTÂNCIA AO QUADRADO ENTRE UM PONTO EM 2D E UM TRONCO (SEGMENTO DE RETA) ---
function checkPointToLogDistanceSq(px, pz, log) {
    const abx = log.bx - log.ax;
    const abz = log.bz - log.az;
    const apx = px - log.ax;
    const apz = pz - log.az;

    const ab2 = abx * abx + abz * abz;
    if (ab2 === 0) return Infinity;

    let t = (apx * abx + apz * abz) / ab2;
    t = Math.max(0, Math.min(1, t)); // Mantém restrito ao comprimento do tronco

    const cx = log.ax + t * abx;
    const cz = log.az + t * abz;

    const dx = px - cx;
    const dz = pz - cz;
    return dx * dx + dz * dz;
}

// --- RESOLUÇÃO DE COLISÃO RÍGIDA COM OS TRONCOS E ÁRVORES DE PÉ (Empurrão Físico Final) ---
function resolveLogCollisions(warrior) {
    if (warrior.isDead) return;
    const px = warrior.mesh.position.x;
    const pz = warrior.mesh.position.z;
    const r = warrior.radius;

    // 1. Colisões com troncos caídos — pré-filtra por AABB para saltar troncos distantes
    for (let i = 0; i < fallenLogs.length; i++) {
        const log = fallenLogs[i];
        const quickDx = px - log.x;
        const quickDz = pz - log.z;
        const quickDistSq = quickDx * quickDx + quickDz * quickDz;
        const quickMaxDist = r + log.radius + log.length * 0.5 + 1.0;
        if (quickDistSq > quickMaxDist * quickMaxDist) continue; // Muito longe, salta

        const distSq = checkPointToLogDistanceSq(px, pz, log);
        const minDist = r + log.radius;

        if (distSq < minDist * minDist) {
            const abx = log.bx - log.ax;
            const abz = log.bz - log.az;
            const apx = px - log.ax;
            const apz = pz - log.az;
            const ab2 = abx * abx + abz * abz;
            if (ab2 === 0) continue;
            let t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / ab2));
            const cx = log.ax + t * abx;
            const cz = log.az + t * abz;
            const dx = px - cx;
            const dz = pz - cz;

            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
                const overlap = minDist - dist;
                warrior.mesh.position.x += (dx / dist) * overlap;
                warrior.mesh.position.z += (dz / dist) * overlap;
            } else {
                warrior.mesh.position.x += (Math.random() - 0.5) * 0.15;
                warrior.mesh.position.z += (Math.random() - 0.5) * 0.15;
            }
        }
    }

    // 2. Colisões com árvores de pé — pré-filtra por AABB
    const minDistTree = r + 0.65;
    const minDistTreeSq = minDistTree * minDistTree;
    const quickTreeMax = minDistTree + 2.0;
    const quickTreeMaxSq = quickTreeMax * quickTreeMax;
    for (let i = 0; i < treePositions.length; i++) {
        const tree = treePositions[i];
        const dx = px - tree.x;
        const dz = pz - tree.z;
        const distSq = dx * dx + dz * dz;
        if (distSq > quickTreeMaxSq) continue; // Muito longe, salta

        if (distSq < minDistTreeSq) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
                const overlap = minDistTree - dist;
                warrior.mesh.position.x += (dx / dist) * overlap;
                warrior.mesh.position.z += (dz / dist) * overlap;
            } else {
                warrior.mesh.position.x += (Math.random() - 0.5) * 0.15;
                warrior.mesh.position.z += (Math.random() - 0.5) * 0.15;
            }
        }
    }
}

// --- COLISÃO DA TRAJETÓRIA DA FLECHA COM OS TRONCOS ---
function checkArrowLogCollision(arrow) {
    const px = arrow.mesh.position.x;
    const py = arrow.mesh.position.y;
    const pz = arrow.mesh.position.z;

    for (let i = 0; i < fallenLogs.length; i++) {
        const log = fallenLogs[i];

        const dist2DSq = checkPointToLogDistanceSq(px, pz, log);
        const minDist = 0.4 + log.radius;

        if (dist2DSq < minDist * minDist) {
            if (Math.abs(py - log.y) < log.radius + 0.8) {
                return true;
            }
        }
    }
    return false;
}

function checkArrowTreeCollision(arrow) {
    const px = arrow.mesh.position.x;
    const py = arrow.mesh.position.y;
    const pz = arrow.mesh.position.z;

    for (let i = 0; i < treePositions.length; i++) {
        const tree = treePositions[i];
        const dx = px - tree.x;
        const dz = pz - tree.z;
        const dist2DSq = dx * dx + dz * dz;

        if (dist2DSq < 4.0) { // 2.0 * 2.0 = 4.0 (raio de 2m da copa/tronco)
            if (py >= tree.y && py <= tree.y + 11.5) {
                return true;
            }
        }
    }
    return false;
}

function checkNearTree(position, radius) {
    const checkRadius = radius || 4.5;
    const checkRadiusSq = checkRadius * checkRadius;
    for (let i = 0; i < treePositions.length; i++) {
        const dx = position.x - treePositions[i].x;
        const dz = position.z - treePositions[i].z;
        const distSq = dx * dx + dz * dz;
        if (distSq < checkRadiusSq) {
            return true;
        }
    }
    return false;
}

// --- 7. SISTEMA DE COLISÃO OTIMIZADO VIA SPATIAL GRID BUCKETING COM MULTI-PASS SUBSTEPPING ---
const GRID_CELL_SIZE = 5;
let GRID_COLS = 34;
let GRID_ROWS = 34;
let spatialGrid = Array.from({ length: GRID_COLS * GRID_ROWS }, () => []);
const allWarriors = [];
const activeCellIndices = [];

function rebuildSpatialGrid() {
    GRID_COLS = Math.ceil((sizeX + 20) / GRID_CELL_SIZE);
    GRID_ROWS = Math.ceil((sizeZ + 20) / GRID_CELL_SIZE);
    spatialGrid = Array.from({ length: GRID_COLS * GRID_ROWS }, () => []);
}

function resolveWarriorCollisions() {
    const knights = battleManager.getKnights();
    const goblins = battleManager.getGoblins();
    const catapults = battleManager.getCatapults();

    // Cache hasEnemyInRange por catapulta para evitar chamadas repetidas
    const catapultHasTarget = new Map();
    for (let i = 0; i < catapults.length; i++) {
        const c = catapults[i];
        if (c.isDead) continue;
        const opp = armies[c.faction].enemies;
        catapultHasTarget.set(c, c.hasEnemyInRange(opp));
    }

    allWarriors.length = 0;
    const kLen = knights.length;
    const gLen = goblins.length;
    for (let i = 0; i < kLen; i++) {
        const w = knights[i];
        if (!w.isDead) {
            if (w.isPusher && w.catapult && !w.catapult.isDead && !catapultHasTarget.get(w.catapult)) continue;
            allWarriors.push(w);
        }
    }
    for (let i = 0; i < gLen; i++) {
        const w = goblins[i];
        if (!w.isDead) {
            if (w.isPusher && w.catapult && !w.catapult.isDead && !catapultHasTarget.get(w.catapult)) continue;
            allWarriors.push(w);
        }
    }

    const length = allWarriors.length;
    if (length === 0) return;

    activeCellIndices.length = 0;
    const halfX = sizeX / 2 + 10;
    const halfZ = sizeZ / 2 + 10;

    for (let i = 0; i < length; i++) {
        const w = allWarriors[i];
        const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor((w.mesh.position.x + halfX) / GRID_CELL_SIZE)));
        const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((w.mesh.position.z + halfZ) / GRID_CELL_SIZE)));
        const index = col + row * GRID_COLS;
        const cell = spatialGrid[index];
        if (cell.length === 0) {
            activeCellIndices.push(index);
        }
        cell.push(w);
    }

    const activeLen = activeCellIndices.length;
    for (let k = 0; k < activeLen; k++) {
        const index = activeCellIndices[k];
        const cellWarriors = spatialGrid[index];
        const col = index % GRID_COLS;
        const row = Math.floor(index / GRID_COLS);

        for (let d = 0; d < 5; d++) {
            let ox = 0, oz = 0;
            if (d === 1) { ox = 1; oz = 0; }
            else if (d === 2) { ox = 1; oz = 1; }
            else if (d === 3) { ox = 0; oz = 1; }
            else if (d === 4) { ox = -1; oz = 1; }

            const ncol = col + ox;
            const nrow = row + oz;
            if (ncol < 0 || ncol >= GRID_COLS || nrow < 0 || nrow >= GRID_ROWS) continue;

            const neighborIndex = ncol + nrow * GRID_COLS;
            const neighbors = spatialGrid[neighborIndex];
            const neighLen = neighbors.length;
            if (neighLen === 0) continue;

            const isSelf = (ox === 0 && oz === 0);
            const cellLen = cellWarriors.length;

            for (let i = 0; i < cellLen; i++) {
                const w1 = cellWarriors[i];
                const startJ = isSelf ? (i + 1) : 0;

                for (let j = startJ; j < neighLen; j++) {
                    const w2 = neighbors[j];
                    if (w1.uid === w2.uid) continue;
                    const dx = w2.mesh.position.x - w1.mesh.position.x;
                    const dz = w2.mesh.position.z - w1.mesh.position.z;
                    const minDistance = (w1.radius + w2.radius) * 1.1;

                    if (Math.abs(dx) < minDistance && Math.abs(dz) < minDistance) {
                        const distanceSq = dx * dx + dz * dz;
                        const minDistanceSq = minDistance * minDistance;

                        if (distanceSq < minDistanceSq && distanceSq > 0.0001) {
                            const distance = Math.sqrt(distanceSq);
                            const overlap = minDistance - distance;

                            const pushX = (dx / distance) * overlap * 0.5;
                            const pushZ = (dz / distance) * overlap * 0.5;

                            w1.mesh.position.x -= pushX;
                            w1.mesh.position.z -= pushZ;
                            w2.mesh.position.x += pushX;
                            w2.mesh.position.z += pushZ;
                        }
                    }
                }
            }
        }
    }

    // Empurra guerreiros para fora das catapultas ativas
    for (let i = 0; i < length; i++) {
        const w = allWarriors[i];
        for (let j = 0; j < catapults.length; j++) {
            const cat = catapults[j];
            if (cat.isDead) continue;

            const dx = w.mesh.position.x - cat.mesh.position.x;
            const dz = w.mesh.position.z - cat.mesh.position.z;
            const minDistance = w.radius + cat.radius; // Ex: 0.8 + 2.5 = 3.3

            if (Math.abs(dx) < minDistance && Math.abs(dz) < minDistance) {
                const distanceSq = dx * dx + dz * dz;
                const minDistanceSq = minDistance * minDistance;

                if (distanceSq < minDistanceSq && distanceSq > 0.0001) {
                    const distance = Math.sqrt(distanceSq);
                    const overlap = minDistance - distance;
                    // Empurra o guerreiro totalmente (pois a catapulta é pesada/estática)
                    w.mesh.position.x += (dx / distance) * overlap;
                    w.mesh.position.z += (dz / distance) * overlap;
                }
            }
        }
    }

    for (let k = 0; k < activeLen; k++) {
        spatialGrid[activeCellIndices[k]].length = 0;
    }
}
// --- CLASSE DOS PROJETEIS DE FLECHA COM TRACER SUBTIL E BRANCO ---
class Arrow {
    constructor(spawnPos, target, damage, faction, isBlocked, wasTreeDefended, shooter = null) {
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
        if (target && target.mesh) {
            this.targetPos.copy(target.mesh.position);
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

        // EFEITO VISUAL: Rastro de vento
        const isNight = (currentEnv === 'noite');
        for (let i = 0; i < 2; i++) {
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

        if (this.elapsedTime >= this.totalTime) {
            this.mesh.position.copy(this.targetPos);
            this.isDead = true;

            if (this.target && !this.target.isDead) {
                const currentTargetPos = this.target.mesh.position.clone();
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
        const enemies = armies[this.faction].enemies;

        const dmgMultiplier = (this.bounceCount === 0) ? 1.0 : 0.6;
        const radiusMultiplier = (this.bounceCount === 0) ? 1.0 : 0.75;
        const currentSplashRadius = this.splashRadius * radiusMultiplier;
        const currentSplashSq = currentSplashRadius * currentSplashRadius;

        for (let i = 0; i < enemies.length; i++) {
            const w = enemies[i];
            if (w.isDead) continue;
            const dx = w.mesh.position.x - ipx;
            const dz = w.mesh.position.z - ipz;
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
// --- CLASSE CATAPULTA ---
class Catapult {
    constructor(faction, x, z) {
        this.faction = faction;
        this.hp = 500;
        this.maxHp = 500;
        this.isDead = false;
        this.attackerCount = 0;
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

        this.mesh = this.buildMesh();
        const terrainY = getTerrainHeight(x, z);
        this.terrainY = terrainY;
        this.mesh.position.set(x, terrainY + 0.64, z);

        // Roda catapulta para encarar o centro da batalha
        this.mesh.rotation.y = armies[faction].catapultRotationY;
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
            const dx = e.mesh.position.x - px;
            const dz = e.mesh.position.z - pz;
            if (dx * dx + dz * dz < rangeSq) {
                return true;
            }
        }
        return false;
    }

    update(opponents, delta, simSpeed) {
        if (this.isDead) return;
        // Rotaciona em direção ao alvo se estiver atirando ou mirando, ou volta para a frente
        if (this.isFiring || this.isAiming) {
            const targetVec = new THREE.Vector3(this.targetX, this.mesh.position.y, this.targetZ);
            const oppositeVec = this.mesh.position.clone().multiplyScalar(2).sub(targetVec);
            const currentRotation = this.mesh.rotation.y;
            this.mesh.lookAt(oppositeVec);
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
            const targetRotation = armies[this.faction].catapultRotationY;
            let diff = targetRotation - this.mesh.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            this.mesh.rotation.y += diff * Math.min(delta * simSpeed * 2.0, 1.0);
        }

        // Verifica se há inimigos ao alcance e se há empurradores vivos
        const hasTarget = this.hasEnemyInRange(opponents);
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
            const dir = armies[this.faction].catapultDir;
            this.mesh.position.x += dir * moveDist;
            this.mesh.position.y = getTerrainHeight(this.mesh.position.x, this.mesh.position.z) + 0.64;

            // Rolamento das rodas
            const wheelRot = dir * (moveDist / 1.1);
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

                    p.mesh.position.set(tx, ty, tz);
                    p.mesh.rotation.y = (dir === 1) ? -Math.PI / 2 : Math.PI / 2;
                    p.lastVelocity.set(dir * speed, 0, 0);
                    p.playRunAnimation(false);
                    if (p.torso) {
                        p.torso.rotation.x = 0.35; // inclina para frente (local space)
                    }
                }
            });
        } else {
            // Se não está se movendo, retorna o torso dos empurradores para a postura ereta
            this.pushers.forEach(p => {
                if (!p.isDead && p.torso) {
                    p.torso.rotation.x = 0;
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
        // Lança D10+10 para definir alcance mínimo desta rodada
        // Campo dividido em 20 seções de (150/20) unidades cada (base original)
        const d10 = Math.floor(Math.random() * 10) + 1;       // 1-10
        const sections = d10 + 10;                             // 11-20
        const minRange = sections * 7.5;                       // 82.5 - 150 u
        const minRangeSq = minRange * minRange;
        const maxRangeSq = this.attackRange * this.attackRange;

        // Encontra centróide de até 12 inimigos dentro da faixa de alcance
        let cx = 0, cz = 0, count = 0;
        const px = this.mesh.position.x;
        const pz = this.mesh.position.z;

        for (let i = 0; i < opponents.length; i++) {
            const e = opponents[i];
            if (e.isDead) continue;
            const dx = e.mesh.position.x - px;
            const dz = e.mesh.position.z - pz;
            const distSq = dx * dx + dz * dz;
            // Só mira em inimigos ALÉM do alcance mínimo (longa distância)
            if (distSq >= minRangeSq && distSq < maxRangeSq) {
                cx += e.mesh.position.x;
                cz += e.mesh.position.z;
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
        this.pendingTargetPos = new THREE.Vector3(cx, getTerrainHeight(cx, cz), cz);
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

        const startPos = new THREE.Vector3();
        this.bucket.getWorldPosition(startPos);

        const boulder = BoulderPool.get(startPos, this.pendingTargetPos, this.damage, this.splashRadius, this.faction);
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
        this.isDead = true;
        scene.remove(this.mesh);
        createSparks(this.mesh.position, false);
        armies[this.faction].addDeadCount();
    }
}
// --- CLASSE DO GUERREIRO MULTI-FUNÇÕES ---
let warriorUidCounter = 0;
class Warrior {
    constructor(faction, role, x, z, isPusher = false, catapult = null) {
        this.uid = warriorUidCounter++;
        this.faction = faction;
        this.role = role;
        this.isPusher = isPusher;
        this.isFlanker = false;
        this.catapult = catapult;
        this.id = faction + "_" + role + "_" + Math.floor(Math.random() * 100000);

        this.hp = (role === 'melee') ? 220 : 100;
        this.maxHp = this.hp;

        const army = armies[faction];
        const baseSpeed = (role === 'melee') ? army.baseSpeedMelee : army.baseSpeedArcher;
        this.speed = (baseSpeed + Math.random() * 0.02) * 60;

        this.attackRange = isNapoleonicTheme() ? 100.0 : ((role === 'melee') ? 2.8 : 100.0);
        this.keepDistanceRange = (role === 'melee') ? 0 : 50.0;
        this.attackCooldown = 0;
        this.isDead = false;
        this.target = null;

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

        this.morale = 6 + Math.floor(Math.random() * 5); // 6 to 10
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

        this.assembleBody();

        const terrainY = getTerrainHeight(x, z);
        this.terrainY = terrainY;
        this.mesh.position.set(x, terrainY + 1.5, z);
        this.mesh.rotation.y = armies[faction].rotationY;
        this.lastTargetAngle = this.mesh.rotation.y;
    }

    assembleBody() {
        if (!templateMeshes[this.faction][this.role]) {
            const template = new THREE.Group();

            const lodMat = armies[this.faction].lodMat();
            const lodGeo = (this.role === 'melee') ? lodGeoCube : lodGeoCircle;
            const lodPrimitive = new THREE.Mesh(lodGeo, lodMat);
            lodPrimitive.name = 'lodPrimitive';
            lodPrimitive.position.y = 1.5;
            lodPrimitive.visible = false;
            template.add(lodPrimitive);

            if (currentTheme === 'napoleonic_3d') {
                // --- TEMA NAPOLEÓNICO 3D (modelo GLB externo) ---
                const wrapper = new THREE.Group();
                wrapper.name = "napoleonic_gltf";
                if (typeof napoleonicSoldierGLTF !== 'undefined' && napoleonicSoldierGLTF) {
                    const soldier = napoleonicSoldierGLTF.clone();
                    // Modelo em A-pose: bounding box Y ~[-0.95, 0.95] → escala 1.5 → altura ~2.85
                    soldier.scale.set(1.5, 1.5, 1.5);
                    // Girar 180° para encarar a frente correta (+Z → -Z)
                    soldier.rotation.y = Math.PI;
                    soldier.position.y = 0;
                    wrapper.add(soldier);
                }
                wrapper.position.y = 0;
                template.add(wrapper);
                // Dummies para compatibilidade com a lógica existente
                const dummyArmL = new THREE.Group(); dummyArmL.name = "armL"; template.add(dummyArmL);
                const dummyArmR = new THREE.Group(); dummyArmR.name = "armR"; template.add(dummyArmR);
                const dummyLegL = new THREE.Group(); dummyLegL.name = "legL"; template.add(dummyLegL);
                const dummyLegR = new THREE.Group(); dummyLegR.name = "legR"; template.add(dummyLegR);
                const dummyTorso = new THREE.Group(); dummyTorso.name = "torso"; template.add(dummyTorso);
                const dummyHead = new THREE.Group(); dummyHead.name = "head"; template.add(dummyHead);
                
                templateMeshes[this.faction][this.role] = template;
            } else if (currentTheme === 'napoleonic') {
                const isFrench = armies[this.faction].isFrench;
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

                const headMat = armies[this.faction].headMat();
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
                    const helmet = new THREE.Mesh(geomHelmet, steelMaterial);
                    helmet.name = "helmet";
                    helmet.position.y = 0.55;
                    head.add(helmet);
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
                    const blade = new THREE.Mesh(geomSwordBlade, armies[this.faction].bladeMat());
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
                templateMeshes[this.faction][this.role] = mergeGroupToMesh(rawTemplate, this.faction);
            }
        }

        this.mesh = templateMeshes[this.faction][this.role].clone();
        this.mesh.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        this.baseColor = new THREE.Color(0xffffff);

        if (this.isPusher) {
            const colorHex = armies[this.faction].colorHex;
            this.baseColor.setHex(colorHex);
            this.mesh.scale.set(1.15, 1.15, 1.15);
        }

        this.lodPrimitive = this.mesh.getObjectByName("lodPrimitive");
        this.highDetail = this.mesh.getObjectByName("highDetail");
        this.torso = this.mesh.getObjectByName("torso");
        this.head = this.mesh.getObjectByName("head");
        this.armL = this.mesh.getObjectByName("armL");
        this.armR = this.mesh.getObjectByName("armR");
        this.legL = this.mesh.getObjectByName("legL");
        this.legR = this.mesh.getObjectByName("legR");
        this.napoleonicGltf = this.mesh.getObjectByName("napoleonic_gltf");

        if (this.role === 'melee' && !isNapoleonicTheme()) {
            this.shield = this.mesh.getObjectByName("shield");
            this.swordGroup = this.mesh.getObjectByName("swordGroup");
        } else {
            this.bowGroup = this.mesh.getObjectByName("bowGroup");
            this.bowString = this.mesh.getObjectByName("bowString");
        }

        if (this.isPusher && isNapoleonicTheme()) {
            if (this.bowGroup) {
                if (this.bowGroup.parent) {
                    this.bowGroup.parent.remove(this.bowGroup);
                }
                this.bowGroup.visible = false;
            }
            if (this.hasTorch) {
                const torchGroup = new THREE.Group();
                const stickMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
                const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), stickMat);
                torchGroup.add(stick);

                const fireGeo = new THREE.SphereGeometry(0.15, 6, 6);
                const fireMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
                const fire = new THREE.Mesh(fireGeo, fireMat);
                fire.position.y = 0.6;
                torchGroup.add(fire);

                torchGroup.position.set(0, -0.6, 0.4);
                torchGroup.rotation.x = Math.PI / 2;

                this.armR.add(torchGroup);
            }
        }
    }
    getAvoidanceDir(dir) {
        if (this.stuckDuration > 0) {
            return dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.stuckAngleOffset);
        }

        const px = this.mesh.position.x;
        const pz = this.mesh.position.z;

        let repelX = 0;
        let repelZ = 0;

        // 1. Desvio de Árvores em Pé
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
        this.knockback.copy(direction).normalize().multiplyScalar(force);
        this.knockbackTimer = duration;
        if (launchY > 0) {
            this.launchVY = launchY;
            this.launchKills = true;
            // Velocidades angulares aleatórias para girar no ar
            this.tumbleX = (Math.random() - 0.5) * 18;
            this.tumbleY = (Math.random() - 0.5) * 12;
            this.tumbleZ = (Math.random() - 0.5) * 18;
        }
    }

    smoothTurn(targetAngle, delta, simSpeed) {
        let diff = targetAngle - this.mesh.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.mesh.rotation.y += diff * Math.min(delta * 12.0 * simSpeed, 1.0);
    }

    updateLOD(cameraPos, maxDistSq, medDistSq) {
        const dx = this.mesh.position.x - cameraPos.x;
        const dy = this.mesh.position.y - cameraPos.y;
        const dz = this.mesh.position.z - cameraPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (lodEnabled && radius > 250) {
            if (this.lodPrimitive && !this.lodPrimitive.visible) this.lodPrimitive.visible = true;
            if (this.highDetail && this.highDetail.visible) this.highDetail.visible = false;
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
            this.lodLevel = 2;
        } else if (lodEnabled && distSq > medDistSq) {
            if (this.lodPrimitive && this.lodPrimitive.visible) this.lodPrimitive.visible = false;
            if (this.highDetail && !this.highDetail.visible) this.highDetail.visible = true;
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
            this.lodLevel = 1;
        } else {
            if (this.lodPrimitive && this.lodPrimitive.visible) this.lodPrimitive.visible = false;
            if (this.highDetail && !this.highDetail.visible) this.highDetail.visible = true;
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
            this.lodLevel = 0;
        }
    }

    update(opponents, delta, simSpeed) {
        if (this.isDead) return;

        const prevX = this.mesh.position.x;
        const prevZ = this.mesh.position.z;

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

        if (atWaterEdge && this.lastVelocity.lengthSq() > 0.0001 && Math.random() < 0.1 * delta * 60) {
            createWaterSplash(this.mesh.position);
        }

        this.animTime += delta * 15 * simSpeed * terrainSpeed;

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta * simSpeed;
        }

        if (this.stuckDuration > 0) {
            this.stuckDuration -= delta * simSpeed;
        }

        this.updateFlash(delta);

        if (this.isAttacking) {
            this.animateAttack(delta, simSpeed);
        }

        if (this.morale <= 4 && !this.isFleeing && !this.isPusher) {
            this.isFleeing = true;
            this.hasRetreated50m = false;
            this.fleeStartX = this.mesh.position.x;
            this.fleeStartZ = this.mesh.position.z;
            this.isAttacking = false;
            this.target = null;
        }

        if (this.isFleeing) {
            if (!this.hasRetreated50m) {
                const dx = this.mesh.position.x - this.fleeStartX;
                const dz = this.mesh.position.z - this.fleeStartZ;
                if (dx * dx + dz * dz >= 2500) {
                    this.hasRetreated50m = true;
                    this.fleeTimer = 0;
                    this.lastVelocity.set(0, 0, 0);
                } else {
                    const dirX = armies[this.faction].dirX;
                    let moveDir = new THREE.Vector3(dirX, 0, 0);
                    moveDir = this.getAvoidanceDir(moveDir);
                    this.lastVelocity.copy(moveDir).multiplyScalar(this.speed * 1.3);
                    this.lastTargetAngle = Math.atan2(moveDir.x, moveDir.z);
                }
            } else {
                this.lastVelocity.set(0, 0, 0);
                this.fleeTimer += delta * simSpeed;
                if (this.fleeTimer >= 10.0) {
                    this.morale++;
                    this.fleeTimer = 0;
                    if (this.morale >= 7) {
                        this.isFleeing = false;
                    }
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

        // --- APLICAÇÃO DO MOVIMENTO ---
        if (this.knockbackTimer > 0) {
            this.mesh.position.addScaledVector(this.knockback, delta * simSpeed);
            this.knockback.multiplyScalar(Math.pow(0.85, delta * 60));
            this.knockbackTimer -= delta * simSpeed;
            if (this.lodLevel === 0) {
                this.playRunAnimation(true);
            }
        } else {
            this.mesh.position.x += this.lastVelocity.x * delta * simSpeed * terrainSpeed;
            this.mesh.position.z += this.lastVelocity.z * delta * simSpeed * terrainSpeed;

            if (this.lastVelocity.lengthSq() > 0.0001) {
                if (this.lodLevel === 0) {
                    this.playRunAnimation(this.isKiting);
                }
                this.smoothTurn(this.lastTargetAngle, delta, simSpeed);
            } else {
                if (!this.isAttacking && this.lodLevel === 0) {
                    this.playIdleAnimation();
                }
            }
        }

        // Ajuste de altura no terreno e limite de arena
        if (this.lastVelocity.lengthSq() > 0.0001 || this.knockbackTimer > 0 || this.launchVY !== 0) {
            this.terrainY = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        }
        const baseHeight = inMud ? 0.8 : 1.5;
        if (this.launchVY !== 0 || this.mesh.position.y > this.terrainY + baseHeight + 0.05) {
            // Guerreiro no ar: aplica gravidade e gira
            this.launchVY -= 9.8 * delta * simSpeed;
            this.mesh.position.y += this.launchVY * delta * simSpeed;
            this.mesh.rotation.x += this.tumbleX * delta * simSpeed;
            this.mesh.rotation.y += this.tumbleY * delta * simSpeed;
            this.mesh.rotation.z += this.tumbleZ * delta * simSpeed;
            if (this.mesh.position.y <= this.terrainY + baseHeight) {
                this.mesh.position.y = this.terrainY + baseHeight;
                this.launchVY = 0;
                this.tumbleX = 0; this.tumbleY = 0; this.tumbleZ = 0;
                this.mesh.rotation.x = 0; this.mesh.rotation.z = 0;
                if (this.launchKills) {
                    this.launchKills = false;
                    this.takeDamage(9999, null);
                    return;
                }
            }
        } else {
            this.mesh.position.y = this.terrainY + baseHeight;
        }
        this.keepInsideArena();

        // Lógica de stuck (travado)
        if (this.isTryingToMove) {
            const dx = this.mesh.position.x - prevX;
            const dz = this.mesh.position.z - prevZ;
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
    }

    updateHeavyAIAndPhysics(opponents, delta, simSpeed) {
        let allOpponentsDead = true;
        for (let i = 0; i < opponents.length; i++) {
            if (!opponents[i].isDead) {
                allOpponentsDead = false;
                break;
            }
        }

        if (allOpponentsDead) {
            this.target = null;
            this.lastVelocity.set(0, 0, 0);
            return;
        }

        if (this.isPusher && this.catapult && !this.catapult.isDead) {
            const cat = this.catapult;
            const hasTarget = cat.hasEnemyInRange(opponents);
            const hasPusherAlive = cat.pushers.some(p => !p.isDead);
            const catIsMoving = !hasTarget && hasPusherAlive;

            if (catIsMoving) {
                resolveLogCollisions(this);
                return;
            }

            // Defende a catapulta se ela não estiver se movendo
            let nearestEnemy = null;
            let minDistSq = 18 * 18;
            const cx = cat.mesh.position.x;
            const cz = cat.mesh.position.z;

            for (let i = 0; i < opponents.length; i++) {
                const e = opponents[i];
                if (e.isDead) continue;
                const dx = e.mesh.position.x - cx;
                const dz = e.mesh.position.z - cz;
                const distSq = dx * dx + dz * dz;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearestEnemy = e;
                }
            }

            if (nearestEnemy) {
                this.target = nearestEnemy;
            } else {
                const dir = armies[this.faction].catapultDir;
                const offsetZ = (this.uid % 2 === 0) ? -1.2 : 1.2;
                const tx = cx - dir * 3.4;
                const tz = cz + offsetZ;

                const dx = tx - this.mesh.position.x;
                const dz = tz - this.mesh.position.z;
                const distSq = dx * dx + dz * dz;
                if (distSq > 0.5) {
                    this.target = null;
                    this.lastVelocity.set(dx, 0, dz).normalize().multiplyScalar(this.speed);
                    this.lastTargetAngle = Math.atan2(dx, dz) + Math.PI;
                    this.isTryingToMove = true;
                } else {
                    this.lastVelocity.set(0, 0, 0);
                    this.target = null;
                }
                resolveLogCollisions(this);
                return;
            }
        }

        this.updateAI(opponents);

        this.isTryingToMove = false;
        this.isKiting = false;

        if (this.target) {
            const dx = this.target.mesh.position.x - this.mesh.position.x;
            const dz = this.target.mesh.position.z - this.mesh.position.z;
            const distSq = dx * dx + dz * dz;

            this.lastTargetAngle = Math.atan2(dx, dz) + Math.PI;

            const targetRadius = this.target.radius || 0.8;
            const actualAttackRange = (this.role === 'melee') ? (this.attackRange - 0.8 + targetRadius) : this.attackRange;
            const actualAttackRangeSq = actualAttackRange * actualAttackRange;

            if (this.role === 'melee') {
                if (distSq > actualAttackRangeSq) {
                    this.moveTowardsTarget(delta, simSpeed);
                } else {
                    this.lastVelocity.set(0, 0, 0);
                    this.stopAndAttack(simSpeed);
                }
            } else {
                if (distSq < this.keepDistanceRange * this.keepDistanceRange) {
                    this.kiteTarget(delta, simSpeed);
                    this.isKiting = true;
                } else if (distSq > actualAttackRangeSq) {
                    this.moveTowardsTarget(delta, simSpeed);
                } else {
                    this.lastVelocity.set(0, 0, 0);
                    this.stopAndAttack(simSpeed);
                }
            }
        } else {
            this.lastVelocity.set(0, 0, 0);
        }

        resolveLogCollisions(this);
    }

    updateAI(opponents) {
        if (!this.aiTick) this.aiTick = 0;
        this.aiTick++;
        if (this.aiTick % 6 !== 0 && this.target && !this.target.isDead) return;

        if (!this.target || this.target.isDead || this.aiTick % 24 === 0) {
            let bestScore = Infinity;
            let bestTarget = null;
            const p1 = this.mesh.position;

            // Alvos: guerreiros inimigos (usa distSq para evitar sqrt)
            for (let i = 0; i < opponents.length; i++) {
                const enemy = opponents[i];
                if (enemy.isDead) continue;

                const enemyPos = enemy.mesh.position;
                const dx = p1.x - enemyPos.x;
                const dz = p1.z - enemyPos.z;
                const dSq = dx * dx + dz * dz;

                let attackersCount = enemy.attackerCount || 0;
                if (this.target === enemy && attackersCount > 0) {
                    attackersCount--;
                }

                // Penalidade alta para que marchem ao redor do combate principal, forçando o flanqueamento
                let score = dSq + attackersCount * 4500;
                if (this.target === enemy) {
                    score -= 500;
                }
                if (this.isFlanker) {
                    if (enemy.role !== 'melee') {
                        score -= 1000000; // Prioriza arqueiros/unidades de retaguarda
                    } else if (dSq < 36) {
                        score -= 3000000; // Autodefesa se guerreiro colado (≤6m)
                    } else {
                        score += 5000000; // Ignora guerreiros de corpo a corpo para manter o contorno
                    }
                }

                if (score < bestScore) {
                    bestScore = score;
                    bestTarget = enemy;
                }
            }

            // Alvos: catapultas inimigas (usa distSq para evitar sqrt)
            const catapults = battleManager.getCatapults();
            for (let i = 0; i < catapults.length; i++) {
                const cat = catapults[i];
                if (cat.isDead || cat.faction === this.faction) continue;

                const catPos = cat.mesh.position;
                const dx = p1.x - catPos.x;
                const dz = p1.z - catPos.z;
                const dSq = dx * dx + dz * dz;

                let attackersCount = cat.attackerCount || 0;
                if (this.target === cat && attackersCount > 0) {
                    attackersCount--;
                }

                let score = dSq + attackersCount * 72;
                if (this.target === cat) {
                    score -= 144;
                }
                if (this.isFlanker) {
                    score -= 2000000;
                }

                if (score < bestScore) {
                    bestScore = score;
                    bestTarget = cat;
                }
            }

            if (bestTarget) {
                this.target = bestTarget;
            }
        }
    }

    moveTowardsTarget(delta, simSpeed) {
        if (!this.target) {
            this.lastVelocity.set(0, 0, 0);
            return;
        }
        let dir = _tmpVec3A.subVectors(this.target.mesh.position, this.mesh.position).normalize();

        const hash = this.uid;
        // Leve variação para não ficarem milimetricamente colados, mas sem espalhar na largada
        const sideAngle = (hash % 10 - 5) * 0.05;
        dir.applyAxisAngle(_axisY, sideAngle);

        dir = this.getAvoidanceDir(dir);

        this.lastVelocity.set(dir.x * this.speed, 0, dir.z * this.speed);
        this.isTryingToMove = true;
    }

    kiteTarget(delta, simSpeed) {
        if (!this.target) {
            this.lastVelocity.set(0, 0, 0);
            return;
        }
        let dir = _tmpVec3A.subVectors(this.mesh.position, this.target.mesh.position).normalize();

        dir = this.getAvoidanceDir(dir);

        this.lastVelocity.set(dir.x * this.speed * 0.7, 0, dir.z * this.speed * 0.7);
        this.isTryingToMove = true;
    }

    keepInsideArena() {
        const limitX = sizeX / 2 - 2;
        const limitZ = sizeZ / 2 - 2;

        if (this.mesh.position.x < -limitX) this.mesh.position.x = -limitX;
        if (this.mesh.position.x > limitX) this.mesh.position.x = limitX;
        if (this.mesh.position.z < -limitZ) this.mesh.position.z = -limitZ;
        if (this.mesh.position.z > limitZ) this.mesh.position.z = limitZ;
    }

    stopAndAttack(simSpeed) {
        this.legL.rotation.x = 0;
        this.legR.rotation.x = 0;

        const isShooter = (this.role === 'archer' || isNapoleonicTheme());
        if (!isShooter) {
            const isTargetCatapult = (this.target && this.target.constructor.name === 'Catapult');
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
                        _tmpVec3A.subVectors(this.target.mesh.position, this.mesh.position).normalize();
                        _tmpVec3B.copy(_tmpVec3A).negate();
                        this.applyKnockback(_tmpVec3B, 8.0, 0.3);
                        this.target.applyKnockback(_tmpVec3A, 8.0, 0.3);

                        this.target.attackCooldown = 0.5;
                        this.attackCooldown = 1.0;

                        createSparks(this.target.mesh.position);
                        playClangSound(0.2);
                    }
                }
            }
        } else {
            if (this.attackCooldown <= 0 && !this.isAttacking) {
                this.isAttacking = true;
                this.attackAnimProgress = 0;
            }
        }
    }

    animateAttack(delta, simSpeed) {
        const isShooter = (this.role === 'archer' || isNapoleonicTheme());

        if (!isShooter) {
            this.attackAnimProgress += delta * 12 * simSpeed;
            const swing = Math.sin(this.attackAnimProgress * Math.PI);

            if (this.lodLevel === 0) {
                if (this.armR) {
                    this.armR.rotation.x = Math.PI / 6 + swing * 1.5;
                    this.armR.position.z = -swing * 0.4;
                }
                if (this.highDetail) {
                    this.highDetail.position.z = -swing * 0.5;
                    this.highDetail.rotation.x = -swing * 0.2;
                }
            }

            if (this.attackAnimProgress >= 1.0) {
                this.isAttacking = false;
                if (this.lodLevel === 0) {
                    if (this.armR) {
                        this.armR.rotation.x = 0;
                        this.armR.position.z = 0;
                    }
                    if (this.highDetail) {
                        this.highDetail.position.z = 0;
                        this.highDetail.rotation.x = 0;
                    }
                }
                this.attackCooldown = 0.8 + Math.random() * 0.5;

                if (this.target && !this.target.isDead) {
                    const dmg = 15 + Math.floor(Math.random() * 15);
                    this.target.takeDamage(dmg, this);
                    this.morale = Math.min(10, this.morale + 1);
                    createSparks(this.target.mesh.position);
                    playClangSound(dmg / 30);
                }
            }
        } else {
            const animSpeed = isNapoleonicTheme() ? 0.85 : 6;
            this.attackAnimProgress += delta * animSpeed * simSpeed;
            const swing = Math.sin(this.attackAnimProgress * Math.PI);

            if (this.lodLevel === 0) {
                if (this.napoleonicGltf) {
                    // Animação de mira: inclina para frente como se apontasse, recuo ao disparar
                    this.napoleonicGltf.rotation.x = -0.2 - swing * 0.15;
                    this.napoleonicGltf.rotation.z = swing * 0.05;
                    this.napoleonicGltf.position.y = 0;
                } else if (isNapoleonicTheme()) {
                    // Braço esquerdo apoia o mosquete à frente (esticado/dobrado para dentro)
                    if (this.armL) {
                        this.armL.rotation.set(-1.2, 0.6, 0);
                        this.armL.position.set(-0.5, 1.275, 0.2);
                    }

                    // Braço direito segura o gatilho na altura do ombro/rosto
                    if (this.armR) {
                        this.armR.rotation.set(-1.4, -0.4, 0);
                        this.armR.position.set(0.5, 1.275, 0.2);
                    }

                    if (this.bowGroup) {
                        // Compensa a rotação do braço para apontar a arma reto (+Z)
                        this.bowGroup.rotation.set(-0.35, -0.6, 0);
                        this.bowGroup.position.set(0.2, -0.9, -0.3);
                    }
                } else {
                    if (this.armL) {
                        this.armL.rotation.x = -Math.PI / 2;
                        this.armL.rotation.y = -Math.PI / 6;
                    }
                    if (this.armR) {
                        this.armR.rotation.x = -Math.PI / 2.5;
                        this.armR.position.z = swing * 0.45;
                    }

                    if (this.bowString) {
                        this.bowString.scale.z = 1.0 + swing * 3.5;
                    }
                }

                if (this.highDetail) {
                    this.highDetail.rotation.x = -0.15 - swing * 0.1;
                    this.highDetail.position.z = swing * 0.15;
                }
            }

            if (this.attackAnimProgress >= 1.0) {
                this.isAttacking = false;
                if (this.lodLevel === 0) {
                    if (this.napoleonicGltf) {
                        this.napoleonicGltf.rotation.x = 0;
                        this.napoleonicGltf.rotation.z = 0;
                        this.napoleonicGltf.position.y = 0;
                    } else if (isNapoleonicTheme()) {
                        // Braço esquerdo relaxado
                        if (this.armL) {
                            this.armL.rotation.set(0, 0, Math.PI / 12);
                            this.armL.position.set(-0.85, 1.275, 0);
                        }
                        // Braço direito gira pra frente, mão segura a coronha por baixo
                        if (this.armR) {
                            this.armR.rotation.set(-0.26, 0, -0.05);
                            this.armR.position.set(0.85, 1.275, 0);
                        }
                        if (this.bowGroup) {
                            this.bowGroup.rotation.set(-1.2, 0, 0);
                            this.bowGroup.position.set(0, -0.3, -0.2);
                        }
                    } else {
                        if (this.armL) {
                            this.armL.rotation.x = 0;
                            this.armL.rotation.y = 0;
                        }
                        if (this.armR) {
                            this.armR.rotation.x = 0;
                            this.armR.position.z = 0;
                        }

                        if (this.bowString) {
                            this.bowString.scale.z = 1.0;
                        }
                    }

                    if (this.highDetail) {
                        this.highDetail.rotation.x = 0;
                        this.highDetail.position.z = 0;
                    }
                }

                this.attackCooldown = isNapoleonicTheme() ? (9.0 + Math.random() * 2.0) : (1.8 + Math.random() * 0.6);

                if (this.target && !this.target.isDead) {
                    const spawnHeight = this.mesh.position.clone();
                    spawnHeight.y += 0.9;

                    const myRoll = Math.floor(Math.random() * 6) + 1;
                    let targetRoll = Math.floor(Math.random() * 6) + 1;

                    const isProtectedByTree = checkNearTree(this.target.mesh.position, 4.5);

                    if (isProtectedByTree) {
                        targetRoll += 1;
                    }

                    const isBlocked = targetRoll >= myRoll;
                    const dmg = 15 + Math.floor(Math.random() * 8);

                    const arrow = ArrowPool.get(spawnHeight, this.target, dmg, this.faction, isBlocked, (isBlocked && isProtectedByTree), this);
                    battleManager.addArrow(arrow);
                    playArrowReleaseSound();
                }
            }
        }
    }

    takeDamage(amount, attacker) {
        this.hp -= amount;
        this.morale = Math.max(1, this.morale - 1);
        this.flashTimer = 0.12; // Inicia flash sem setTimeout

        createBlood(this.mesh.position);

        if (attacker && attacker.role === 'melee') {
            _tmpVec3A.subVectors(this.mesh.position, attacker.mesh.position).normalize();
            this.applyKnockback(_tmpVec3A, 4.5, 0.2);
        }

        if (this.hp <= 0 && !this.isDead) {
            this.die(attacker);
        }
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
        this.isDead = true;
        playDeathSound();
        battleManager.setKills(battleManager.getKills() + 1);

        HUD.updateKills(battleManager.getKills());

        armies[this.faction].addDeadCount();
        const idx = armies[this.faction].list.indexOf(this);
        if (idx !== -1) armies[this.faction].list.splice(idx, 1);
        HUD.updateArmy(this.faction, armies[this.faction].list.length);

        battleManager.getDeadWarriors().push(this);

        this.mesh.rotation.z = Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
        this.mesh.position.y = getTerrainHeight(this.mesh.position.x, this.mesh.position.z) + 0.2;

        this.armL.rotation.x = 0;
        this.armR.rotation.x = 0;
        this.legL.rotation.x = 0;
        this.legR.rotation.x = 0;
    }

    fadeAndSink(delta) {
        this.mesh.position.y -= delta * 0.3;
        if (this.mesh.position.y < -5) {
            scene.remove(this.mesh);
            if (this.uniqueBodyMat) {
                this.uniqueBodyMat.dispose();
            }
            return true;
        }
        return false;
    }

    playRunAnimation(reverse) {
        if (this.napoleonicGltf) {
            // Marcha: balanço lateral (ombro a ombro), leve inclinação para frente, balanço vertical suave
            const sway = Math.sin(this.animTime) * 0.08;        // balanço lateral sutil
            const lean = -0.12;                                  // inclinação para frente ao andar
            const bob = Math.abs(Math.sin(this.animTime * 2)) * 0.08; // bobbing vertical mínimo
            this.napoleonicGltf.rotation.z = sway;
            this.napoleonicGltf.rotation.x = lean;
            this.napoleonicGltf.position.y = bob;
            return;
        }

        if (this.highDetail) {
            // Merged warrior animation: sway side-to-side, lean forward, and vertical bobbing
            const sway = Math.sin(this.animTime) * 0.08;
            const lean = -0.12;
            const bob = Math.abs(Math.sin(this.animTime * 2)) * 0.15;
            this.highDetail.rotation.z = sway;
            this.highDetail.rotation.x = lean;
            this.highDetail.position.y = bob;
            return;
        }

        const modifier = reverse ? -1 : 1;
        const swing = Math.sin(this.animTime) * 0.7 * modifier;
        this.legL.rotation.x = swing;
        this.legR.rotation.x = -swing;

        if (isNapoleonicTheme()) {
            // Marcha napoleónica: braço direito carrega o mosquete apoiado no ombro direito
            this.armL.rotation.set(swing * 0.5, 0, Math.PI / 12);
            this.armL.position.set(-0.85, 1.275, 0);

            // Braço direito gira pra frente, mão segura a coronha por baixo
            this.armR.rotation.set(0.43, 0, -0.05);
            this.armR.position.set(0.85, 1.275, 0);

            if (this.bowGroup) {
                this.bowGroup.rotation.set(-1.55, 0, 0);
                this.bowGroup.position.set(0, -0.1, -0.3);
            }
        } else {
            this.armL.rotation.x = -swing * 0.5;
            if (!this.isAttacking) {
                this.armR.rotation.x = swing * 0.5;
            }
        }

        this.torso.position.y = isNapoleonicTheme() ? 0.525 + Math.abs(Math.sin(this.animTime * 2)) * 0.15 : Math.abs(Math.sin(this.animTime * 2)) * 0.15;
    }

    playIdleAnimation() {
        if (this.napoleonicGltf) {
            // Respiração suave
            const breathe = Math.sin(this.animTime * 0.3) * 0.015;
            this.napoleonicGltf.rotation.z = breathe;
            this.napoleonicGltf.rotation.x = 0;
            this.napoleonicGltf.position.y = 0;
            return;
        }

        if (this.highDetail) {
            // Smooth vertical idle breathing animation
            const breathe = Math.sin(this.animTime * 0.3) * 0.03;
            this.highDetail.position.y = breathe;
            this.highDetail.rotation.z = 0;
            this.highDetail.rotation.x = 0;
            return;
        }

        this.legL.rotation.x = 0;
        this.legR.rotation.x = 0;
        this.torso.position.y = isNapoleonicTheme() ? 0.525 : 0;

        if (isNapoleonicTheme()) {
            // Posição de guarda: mosquete apoiado no ombro direito
            this.armL.rotation.set(0, 0, Math.PI / 12);
            this.armL.position.set(-0.85, 1.275, 0);

            // Braço direito gira pra frente, mão segura a coronha por baixo
            this.armR.rotation.set(0.43, 0, -0.05);
            this.armR.position.set(0.85, 1.275, 0);

            if (this.bowGroup) {
                this.bowGroup.rotation.set(-1.55, 0, 0);
                this.bowGroup.position.set(0, -0.1, -0.3);
            }
        } else {
            const breathing = Math.sin(this.animTime * 0.2) * 0.1;
            this.armL.rotation.z = -breathing;
            if (!this.isAttacking) {
                this.armR.rotation.z = breathing;
            }
        }
    }
}

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
        const dir = armies[faction].dirX;
        
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
            armies[faction].list.push(p1, p2);
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
            rainPositions[i * 3] = camX + camDir.x * maxDist * 0.5 + (Math.random() - 0.5) * maxDist * 1.2;
            rainPositions[i * 3 + 2] = camZ + camDir.z * maxDist * 0.5 + (Math.random() - 0.5) * maxDist * 1.2;
            rainPositions[i * 3 + 1] = CONFIG.RAIN_START_Y + Math.random() * CONFIG.RAIN_VAR_Y;
            continue; // Pula matrix update neste frame (economiza CPU)
        }

        // Físicas da chuva
        let py = rainPositions[i * 3 + 1];
        py -= rainVelocities[i] * dt * simSpeed;
        
        if (py < 0) {
            py = CONFIG.RAIN_START_Y + Math.random() * CONFIG.RAIN_VAR_Y;
            rainPositions[i * 3] = camX + (Math.random() - 0.5) * maxDist * 1.2;
            rainPositions[i * 3 + 2] = camZ + (Math.random() - 0.5) * maxDist * 1.2;
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
        scene.remove(w.mesh);
        if (w.uniqueBodyMat) w.uniqueBodyMat.dispose();
    });
    battleManager.getGoblins().forEach(w => {
        scene.remove(w.mesh);
        if (w.uniqueBodyMat) w.uniqueBodyMat.dispose();
    });
    battleManager.getDeadWarriors().forEach(w => {
        scene.remove(w.mesh);
        if (w.uniqueBodyMat) w.uniqueBodyMat.dispose();
    });
    battleManager.setKnights([]);
    battleManager.setGoblins([]);
    battleManager.setDeadWarriors([]);
    battleManager.setKills(0);
    totalDeadKnights = 0;
    totalDeadGoblins = 0;
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
    
    spawnArmies();
    spawnCatapults();
    
    resetCamera();
    playWarCrySound();
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
                w.mesh.visible = true;
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

class BattleManager {
    constructor() {
        this.knights = [];
        this.goblins = [];
        this.arrows = [];
        this.catapults = [];
        this.deadWarriors = [];
        this.particles = [];
        this.kills = 0;
        this.battleEnded = false;
        this.simulationSpeed = 1.0;
        this.pause = false;
    }

    getKnights() { return this.knights; }
    getGoblins() { return this.goblins; }
    getArrows() { return this.arrows; }
    getCatapults() { return this.catapults; }
    getDeadWarriors() { return this.deadWarriors; }
    getParticles() { return this.particles; }
    getKills() { return this.kills; }
    isBattleEnded() { return this.battleEnded; }
    getSimulationSpeed() { return this.simulationSpeed; }
    isPaused() { return this.pause; }

    setKnights(list) { this.knights = list; }
    setGoblins(list) { this.goblins = list; }
    setArrows(list) { this.arrows = list; }
    setCatapults(list) { this.catapults = list; }
    setDeadWarriors(list) { this.deadWarriors = list; }
    setParticles(list) { this.particles = list; }
    
    addKill() { this.kills++; }
    setKills(count) { this.kills = count; }
    setBattleEnded(state) { this.battleEnded = state; }
    setSimulationSpeed(speed) { this.simulationSpeed = speed; }
    setPause(state) { this.pause = state; }

    addKnight(k) { this.knights.push(k); }
    addGoblin(g) { this.goblins.push(g); }
    addArrow(a) { this.arrows.push(a); }
    addCatapult(c) { this.catapults.push(c); }
    addDeadWarrior(w) { this.deadWarriors.push(w); }
    addParticle(p) { this.particles.push(p); }

    removeKnight(k) {
        const idx = this.knights.indexOf(k);
        if (idx !== -1) this.knights.splice(idx, 1);
    }
    removeGoblin(g) {
        const idx = this.goblins.indexOf(g);
        if (idx !== -1) this.goblins.splice(idx, 1);
    }

    clearAll() {
        this.knights.length = 0;
        this.goblins.length = 0;
        this.arrows.length = 0;
        this.catapults.length = 0;
        this.deadWarriors.length = 0;
        this.particles.length = 0;
        this.kills = 0;
        this.battleEnded = false;
    }
}

// Global instance to avoid multiple new global variables
const battleManager = new BattleManager();
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
        baseSpeedMelee: 0.05,
        baseSpeedArcher: 0.06,
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
        baseSpeedMelee: 0.07,
        baseSpeedArcher: 0.08,
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

function spawnFormation(faction, role, count, startX, dir, startXOffset, zBase, colsPerBlock, spacingX, spacingZ) {
    let depth = 0;
    const formationStartX = startX + dir * startXOffset;
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / colsPerBlock);
        const col = i % colsPerBlock;
        depth = Math.max(depth, row + 1);
        
        const x = formationStartX + dir * (row * spacingX);
        const z = zBase + (col - (colsPerBlock - 1) / 2) * spacingZ;
        
        const w = new Warrior(faction, role, x, z);
        armies[faction].list.push(w);
    }
    return depth;
}

function spawnMelee(faction, count, startX, dir, zBase, colsPerBlock, spacingX, spacingZ) {
    return spawnFormation(faction, 'melee', count, startX, dir, 0, zBase, colsPerBlock, spacingX, spacingZ);
}

function spawnArchers(faction, count, startX, dir, zBase, archerStartXOffset, colsPerBlock, spacingX, spacingZ) {
    return spawnFormation(faction, 'archer', count, startX, dir, archerStartXOffset, zBase, colsPerBlock, spacingX, spacingZ);
}

function registerGroups(faction, groups) {
    armies[faction].groups = groups;
}

function updateArmyCounters() {
    HUD.updateArmyCounts(battleManager.getKnights().length, battleManager.getGoblins().length);
}

function spawnUnits(faction, quantity) {
    const { numArchers, numMelee } = calculateArmyComposition(quantity, archerRatio, isNapoleonicTheme);

    const colsPerBlock = CONFIG.UNITS_COLS_PER_BLOCK;
    const spacingX = CONFIG.UNITS_SPACING_X;
    const spacingZ = CONFIG.UNITS_SPACING_Z;

    const dir = armies[faction].dirX;
    const startX = dir * (sizeX * CONFIG.BATTLEFIELD_START_X_RATIO);

    const { G, groupSpacingZ } = createGroups(numMelee, sizeZ, CONFIG.BATTLEFIELD_MAX_Z_RATIO, CONFIG.UNITS_BASE_GROUP_SPACING);

    const groups = [];

    for (let g = 0; g < G; g++) {
        const countMelee = Math.floor(numMelee / G) + (g < numMelee % G ? 1 : 0);
        const countArchers = Math.floor(numArchers / G) + (g < numArchers % G ? 1 : 0);
        const zBase = (g - (G - 1) / 2) * groupSpacingZ;

        const meleeDepth = spawnMelee(faction, countMelee, startX, dir, zBase, colsPerBlock, spacingX, spacingZ);

        const archerStartXOffset = meleeDepth * spacingX + CONFIG.UNITS_ARCHER_GAP;
        const archerDepth = spawnArchers(faction, countArchers, startX, dir, zBase, archerStartXOffset, colsPerBlock, spacingX, spacingZ);

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

// --- CONTROLO TÁTIL E ARRASTAMENTO INTEGRADO NATIVO ---
const controls = {
    target: new THREE.Vector3(0, 0, 0),
    enabled: true,
    update: function () { }
};

let theta = 0.5; // Ângulo horizontal
let phi = 1.0;   // Ângulo vertical
let radius = 60; // Distância da câmara

function updateCameraAngles() {
    phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi));
    camera.position.x = controls.target.x + radius * Math.sin(theta) * Math.sin(phi);
    camera.position.y = controls.target.y + radius * Math.cos(phi);
    camera.position.z = controls.target.z + radius * Math.cos(theta) * Math.sin(phi);
    camera.lookAt(controls.target);
}

// Função de zoom dedicada
window.zoomCamera = function (amount) {
    const maxRadius = Math.max(sizeX, sizeZ) * 0.65;
    radius = Math.max(15, Math.min(maxRadius, radius + amount));
    if (typeof cameraMode !== 'undefined' && cameraMode === 'cinematic') {
        cinematicZoomPauseTimer = 3.0;
    } else {
        updateCameraAngles();
    }
};

// Gestão de Toques e Rato simultâneos (iPad Safari)
let isPointerDown = false;
let prevPointerX = 0;
let prevPointerY = 0;
let activeDragButton = -1;

function onPointerStart(x, y, button = 0) {
    isPointerDown = true;
    activeDragButton = button;
    prevPointerX = x;
    prevPointerY = y;
}

function onPointerMove(x, y) {
    if (!isPointerDown || !controls.enabled) return;
    const dx = x - prevPointerX;
    const dy = y - prevPointerY;

    if (activeDragButton === 2) {
        // Mover a câmara (pan) usando o botão direito
        const forward = new THREE.Vector3();
        forward.set(controls.target.x - camera.position.x, 0, controls.target.z - camera.position.z).normalize();
        const right = new THREE.Vector3(-forward.z, 0, forward.x);

        const panSensitivity = radius * 0.0015;

        controls.target.addScaledVector(right, -dx * panSensitivity);
        controls.target.addScaledVector(forward, dy * panSensitivity);

        const maxLimitX = sizeX / 2 + 20;
        const maxLimitZ = sizeZ / 2 + 20;
        controls.target.x = Math.max(-maxLimitX, Math.min(maxLimitX, controls.target.x));
        controls.target.z = Math.max(-maxLimitZ, Math.min(maxLimitZ, controls.target.z));

        updateCameraAngles();
    } else {
        // Rotacionar a câmara
        theta -= dx * 0.007;
        phi -= dy * 0.007;
        updateCameraAngles();
    }

    prevPointerX = x;
    prevPointerY = y;
}

function onPointerEnd() {
    isPointerDown = false;
    activeDragButton = -1;
}

// Desativa o menu de contexto no painel de visualização para permitir arrastamento com botão direito
window.addEventListener('contextmenu', (e) => {
    if (e.clientY > 80 && e.clientX > 340) {
        e.preventDefault();
    }
});

// Listeners Rato (PC/Desktop)
window.addEventListener('mousedown', function (e) {
    if (e.clientY > 80 && e.clientX > 340) {
        if (e.button === 0 || e.button === 2) {
            onPointerStart(e.clientX, e.clientY, e.button);
        }
    }
});
window.addEventListener('mousemove', function (e) { onPointerMove(e.clientX, e.clientY); });
window.addEventListener('mouseup', onPointerEnd);

// Listeners Toques Táteis (Safari Tablet/iPad)
window.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch.clientY > 80 && touch.clientX > 340) {
            onPointerStart(touch.clientX, touch.clientY);
        }
    }
}, { passive: true });

window.addEventListener('touchmove', function (e) {
    if (e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: true });

window.addEventListener('touchend', onPointerEnd);

// Zoom com roda do rato
window.addEventListener('wheel', function (e) {
    const controlPanel = document.getElementById('control-panel');
    if (controlPanel && controlPanel.contains(e.target)) return;

    if (!controls.enabled && cameraMode !== 'cinematic') return;
    zoomCamera(e.deltaY * 0.05);
}, { passive: true });

const cannonCarriageGeo = new THREE.BoxGeometry(2.3, 1.2, 4.8);
const cannonRimGeo = new THREE.TorusGeometry(1.68, 0.24, 8, 24);
const cannonHubGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.48, 12);
const cannonSpokeGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.36, 8);
const cannonAxleGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.84, 6);
const cannonBarrelGeo = new THREE.CylinderGeometry(0.36, 0.54, 5.4, 12);
const cannonBackGeo = new THREE.SphereGeometry(0.54, 8, 8);

const cataBaseGeo = new THREE.BoxGeometry(6.4, 1.0, 4.0);
const cataWheelGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.56, 8);
const cataAxleGeo1 = new THREE.CylinderGeometry(0.2, 0.2, 4.0, 6);
const cataAxleGeo2 = new THREE.CylinderGeometry(0.2, 0.2, 4.0, 6);
const cataSupportGeo = new THREE.BoxGeometry(0.44, 4.4, 0.44);
const cataCrossGeo = new THREE.BoxGeometry(3.2, 0.4, 0.4);
const cataArmLongGeo = new THREE.BoxGeometry(0.36, 6.4, 0.36);
const cataCounterGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
const cataBucketGeo = new THREE.SphereGeometry(0.5, 6, 4);

// --- OPTIMIZAÇÃO DE PERFORMANCE PARA A IA EM LARGA ESCALA ---
let simulationFrame = 0;
function precalculateAICounts() {
    const knights = battleManager.getKnights();
    const goblins = battleManager.getGoblins();
    const catapults = battleManager.getCatapults();
    
    const kLen = knights.length;
    for (let i = 0; i < kLen; i++) {
        knights[i].attackerCount = 0;
    }
    const gLen = goblins.length;
    for (let i = 0; i < gLen; i++) {
        goblins[i].attackerCount = 0;
    }
    for (let i = 0; i < catapults.length; i++) {
        catapults[i].attackerCount = 0;
    }

    for (let i = 0; i < kLen; i++) {
        const w = knights[i];
        if (w.isDead) continue;
        if (w.target && !w.target.isDead) {
            w.target.attackerCount++;
        }
    }

    for (let i = 0; i < gLen; i++) {
        const w = goblins[i];
        if (w.isDead) continue;
        if (w.target && !w.target.isDead) {
            w.target.attackerCount++;
        }
    }
}
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

function renderWarriorsInstanced() {
    imAllocator.resetCounts();

    const activeParticles = [];
    const poolArray = ParticlePool.pool;
    for (let i = 0; i < poolArray.length; i++) {
        if (poolArray[i].life > 0) activeParticles.push(poolArray[i]);
    }

    const all = [...battleManager.getKnights(), ...battleManager.getGoblins(), ...battleManager.getDeadWarriors(), ...battleManager.getArrows(), ...activeParticles, ...battleManager.getCatapults()];

    for (let i = 0; i < all.length; i++) {
        const w = all[i];

        if (!w.mesh.visible) {
            if (w.lodLevel !== undefined && w.lodLevel > 1) continue;
            if (w.lodLevel === undefined) continue;
        }

        w.mesh.updateMatrixWorld(true);
        const isFlashed = w.flashTimer > 0;

        w.mesh.traverse(child => {
            if (child.isMesh && child.visible) {
                const im = imAllocator.getIM(child.geometry, child.material);
                const idx = im.count;
                if (idx >= im.instanceMatrix.count) return;

                im.setMatrixAt(idx, child.matrixWorld);

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

                im.count++;
            }
        });
    }
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
        knights.forEach(w => center.add(w.mesh.position));
        goblins.forEach(w => center.add(w.mesh.position));
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
// --- 11. INICIAR SIMULAÇÃO ---
function initBattlefield() {
    try {
        HUD.init();
        if (typeof setupBattleListeners === 'function') {
            setupBattleListeners();
        }

        setEnvironment('dia');
        resetBattle();
        animate();

        HUD.hideLoader();
    } catch (e) {
        HUD.showLoaderError(e.message);
    }
}


if (document.readyState === 'complete' || document.readyState === 'interactive') { initBattlefield(); } else { document.addEventListener('DOMContentLoaded', initBattlefield); }
