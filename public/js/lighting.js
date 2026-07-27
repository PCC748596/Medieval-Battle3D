// --- 3. ILUMINAÇÃO & AMBIENTES ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
if (window.scene) scene.add(ambientLight);

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
if (window.scene) scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
rimLight.position.set(-20, 10, -10);
if (window.scene) scene.add(rimLight);

currentEnv = 'dia';
function setEnvironment(type) {
    currentEnv = type;
    if (window.HUD && window.HUD.updateWeather) {
        HUD.updateWeather(type);
    }
    if (!window.scene || !scene.background) return;

    if (type === 'dia') {
        scene.background.setHex(0x87CEEB);
        scene.fog.color.setHex(0x87CEEB);
        ambientLight.color.setHex(0xffffff);
        ambientLight.intensity = 0.9;
        dirLight.color.setHex(0xfffaf0);
        dirLight.intensity = 1.2;
        rimLight.color.setHex(0xffffff);
        rimLight.intensity = 0.3;
        if (typeof matArrowShaft !== 'undefined') matArrowShaft.color.setHex(0x3b2313); // Marrom
    } else if (type === 'sunset') {
        scene.background.setHex(0x381e18);
        scene.fog.color.setHex(0x381e18);
        ambientLight.color.setHex(0xff9977);
        ambientLight.intensity = 0.45;
        dirLight.color.setHex(0xff5522);
        dirLight.intensity = 0.8;
        rimLight.color.setHex(0xaa33ff);
        rimLight.intensity = 0.45;
        if (typeof matArrowShaft !== 'undefined') matArrowShaft.color.setHex(0xffffff); // Branca
    } else if (type === 'noite') {
        scene.background.setHex(0x07090e);
        scene.fog.color.setHex(0x07090e);
        ambientLight.color.setHex(0x445577);
        ambientLight.intensity = 0.45;
        dirLight.color.setHex(0x77aaff);
        dirLight.intensity = 0.8;
        rimLight.color.setHex(0xddddff);
        rimLight.intensity = 0.4;
        if (typeof matArrowShaft !== 'undefined') matArrowShaft.color.setHex(0xffffff); // Branca
    }

    // Escurece o ambiente de acordo com a quantidade de nuvens
    const cloudFactor = (typeof numCloudsSetting !== 'undefined' ? numCloudsSetting : 200) / 1000.0;
    dirLight.intensity *= (1.0 - cloudFactor * 0.85);
    ambientLight.intensity *= (1.0 - cloudFactor * 0.5);
}
window.setEnvironment = setEnvironment;