// @ts-nocheck
// --- 2. ÁUDIO DO JOGO ---
// Som ambiente único do jogo: loop de tambores de batalha
let soundEnabled = false;

const bgMusic = new Audio("sounds/Tribal-drum-loop.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.45;

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
    }
};

// Efeitos sonoros desativados — o jogo usa apenas o loop de tambores
window.playClangSound = function () {};
window.playArrowReleaseSound = function () {};
window.playDeathSound = function () {};
window.playWarCrySound = function () {};

window.startContinuousCrowdRoar = function () {};
window.stopContinuousCrowdRoar = function () {};
window.startDrumLoop = function () {
    if (window.PerformanceProfiler) window.PerformanceProfiler.start('sons');
    if (!soundEnabled) {
        if (window.PerformanceProfiler) window.PerformanceProfiler.end('sons');
        return;
    }
    bgMusic.play().catch(e => {  });
    if (window.PerformanceProfiler) window.PerformanceProfiler.end('sons');
};
window.stopDrumLoop = function () {
    if (window.PerformanceProfiler) window.PerformanceProfiler.start('sons');
    bgMusic.pause();
    if (window.PerformanceProfiler) window.PerformanceProfiler.end('sons');
};
