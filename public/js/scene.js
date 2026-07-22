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
