// --- OPTIMIZAÇÃO DE PERFORMANCE PARA A IA EM LARGA ESCALA ---
let simulationFrame = 0;

function precalculateAICounts() {
    if (simulationFrame % 5 !== 0) return; // Only update every 5 frames
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

    // Atualiza caches de representantes vivos para fallback rápido
    battleManager.activeKnightsCache.length = 0;
    let kFound = 0;
    const kStart = simulationFrame % kLen;
    for (let i = 0; i < kLen && kFound < 10; i++) {
        const idx = (kStart + i * 17) % kLen;
        const w = knights[idx];
        if (w && !w.isDead) {
            battleManager.activeKnightsCache.push(w);
            kFound++;
        }
    }

    battleManager.activeGoblinsCache.length = 0;
    let gFound = 0;
    const gStart = simulationFrame % gLen;
    for (let i = 0; i < gLen && gFound < 10; i++) {
        const idx = (gStart + i * 17) % gLen;
        const w = goblins[idx];
        if (w && !w.isDead) {
            battleManager.activeGoblinsCache.push(w);
            gFound++;
        }
    }
}
