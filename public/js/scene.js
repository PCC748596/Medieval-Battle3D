// --- 1. SETUP DO AMBIENTE THREE.JS OPTIMIZADO ---
if (!window.scene) {
    scene = new THREE.Scene();
    window.scene = scene;
}
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 1.125 / sizeX);

camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2500);
window.camera = camera;

// Renderizador estável e otimizado para dispositivos móveis
renderer = new THREE.WebGLRenderer({
    antialias: false,
    precision: "mediump"
});
window.renderer = renderer;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);
