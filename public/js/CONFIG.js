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