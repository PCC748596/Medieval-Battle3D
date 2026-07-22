// @ts-nocheck
// --- 2. ÁUDIO DO JOGO ---
let soundEnabled = false;

const bgMusic = new Audio("sounds/tribe-drum-loop.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.45;

const warCryMusic = new Audio("sounds/battle-warrior-fighting-drums-478210.mp3");
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
            // Ignore autoplay errors quietly to not pollute tests
            audio.play().catch(e => {  });
            idx = (idx + 1) % size;
        }
    };
}

const swordPool = createAudioPool("sounds/sword.mp3", 15, 0.4);
const arrowPool = createAudioPool("sounds/arrow-swish.mp3", 10, 0.3);

window.toggleAudio = function () {
    soundEnabled = !soundEnabled;
    console.log("Toggle audio clicked! soundEnabled is now:", soundEnabled);
    
    // Atualizar UI
    if (window.HUD && typeof window.HUD.updateAudioBtn === 'function') {
        window.HUD.updateAudioBtn(soundEnabled);
    } else if (typeof HUD !== 'undefined' && typeof HUD.updateAudioBtn === 'function') {
        HUD.updateAudioBtn(soundEnabled);
    }
    
    if (soundEnabled) {
        if (window.battleManager && !window.battleManager.isPaused()) {
            console.log("Playing bgMusic...");
            bgMusic.play().catch(e => { });
        } else if (typeof battleManager !== 'undefined' && !battleManager.isPaused()) {
            console.log("Playing bgMusic...");
            bgMusic.play().catch(e => { });
        } else if (!window.battleManager && typeof battleManager === 'undefined') {
            console.log("Playing bgMusic...");
            bgMusic.play().catch(e => { });
        }
    } else {
        console.log("Pausing music...");
        bgMusic.pause();
        warCryMusic.pause();
    }
};

window.playClangSound = function (intensity) {
    if (!soundEnabled) return;
    swordPool.play(0.5 + intensity * 0.5);
};

window.playArrowReleaseSound = function () {
    if (!soundEnabled) return;
    arrowPool.play(1.0);
};

window.playDeathSound = function () {
    // Pode adicionar som de morte se necessário
};

window.playWarCrySound = function () {
    if (!soundEnabled) return;
    warCryMusic.currentTime = 0;
    warCryMusic.play().catch(e => {  });
};

window.startContinuousCrowdRoar = function () {};
window.stopContinuousCrowdRoar = function () {};
window.startDrumLoop = function () {};
window.stopDrumLoop = function () {};
