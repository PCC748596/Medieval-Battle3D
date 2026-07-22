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
        this.activeKnightsCache = [];
        this.activeGoblinsCache = [];
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
        this.activeKnightsCache.length = 0;
        this.activeGoblinsCache.length = 0;
    }
}

// Global instance to avoid multiple new global variables
const battleManager = new BattleManager();