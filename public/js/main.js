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