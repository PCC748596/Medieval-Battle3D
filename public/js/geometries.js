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
