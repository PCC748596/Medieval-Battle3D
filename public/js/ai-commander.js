/**
 * AI Commander System (Hybrid Layered AI)
 * General -> Brigada -> Formacao -> Soldado
 * 
 * REGRA FUNDAMENTAL: Este sistema NÃO interfere no combate individual.
 * O warrior.js já tem busca de alvo, ataque e movimentação funcionando.
 * O Commander apenas:
 *   1. Rastreia o estado geral (ADVANCING, ENGAGED, FLEEING) para o HUD
 *   2. Mantém estatísticas de moral/coesão da brigada
 *   3. NÃO seta formationTarget = null (isso mata a IA dos soldados)
 */

class Formacao {
    constructor(brigada) {
        this.brigada = brigada;
        this.soldiers = [];
        this.type = 'line'; // 'line', 'block', 'wedge'
        this.lastUpdate = 0;
        this.cohesion = 100;
        this.centerPosition = new THREE.Vector3();
        this.direction = new THREE.Vector3(0, 0, 1);
    }

    addSoldier(soldier) {
        this.soldiers.push(soldier);
        soldier.formation = this;
    }

    update(now) {
        if (now - this.lastUpdate < CONFIG.AI_FORMACAO_UPDATE_MS) return;
        this.lastUpdate = now;

        if (this.soldiers.length === 0) return;

        // Calculate center of living soldiers
        this.centerPosition.set(0, 0, 0);
        let activeCount = 0;
        
        for (const s of this.soldiers) {
            if (!s.isDead) {
                this.centerPosition.x += s.x;
                this.centerPosition.y += s.y;
                this.centerPosition.z += s.z;
                activeCount++;
            }
        }

        if (activeCount > 0) {
            this.centerPosition.divideScalar(activeCount);
        }

        // Calculate cohesion (how spread out the formation is)
        if (activeCount > 1) {
            let totalSpread = 0;
            for (const s of this.soldiers) {
                if (s.isDead) continue;
                const dx = s.x - this.centerPosition.x;
                const dz = s.z - this.centerPosition.z;
                totalSpread += Math.sqrt(dx * dx + dz * dz);
            }
            const avgSpread = totalSpread / activeCount;
            // Cohesion: 100 = tight, 0 = very spread out
            this.cohesion = Math.max(0, Math.min(100, 100 - avgSpread * 2));
        }
    }
}

class Brigada {
    constructor(general, id, type) {
        this.general = general;
        this.id = id;
        this.type = type; // 'INFANTRY', 'CAVALRY', 'ARCHER', etc.
        this.formations = [];
        this.lastUpdate = 0;
        this.targetPosition = new THREE.Vector3();
        this.targetBrigade = null;
        this.state = 'IDLE'; // IDLE, ADVANCING, ENGAGED, BREAKING, FLEEING
        this.order = 'ADVANCE'; // ADVANCE, WAIT
    }

    createFormation() {
        const f = new Formacao(this);
        this.formations.push(f);
        return f;
    }

    update(now) {
        if (now - this.lastUpdate < CONFIG.AI_BRIGADA_UPDATE_MS) return;
        this.lastUpdate = now;

        // Count alive, fleeing, and fighting soldiers
        let alive = 0;
        let fleeing = 0;
        let fighting = 0;
        
        for (const f of this.formations) {
            for (const s of f.soldiers) {
                if (!s.isDead) {
                    alive++;
                    if (s.isFleeing) fleeing++;
                    if (s.currentState === 'FIGHTING') fighting++;
                }
            }
        }

        if (alive === 0) {
            this.state = 'DESTROYED';
            return;
        }

        // Determine brigade state based on what soldiers are ACTUALLY doing
        // (observe, don't command — the warrior.js handles the real behavior)
        if (fleeing > 0 && fleeing / alive > 0.5) {
            this.state = 'FLEEING';
        } else if (fleeing > 0) {
            this.state = 'BREAKING';
        } else if (fighting > 0) {
            this.state = 'ENGAGED';
        } else {
            this.state = 'ADVANCING';
        }

        // Update all formations (just stats tracking)
        for (const f of this.formations) {
            f.update(now);
        }
    }
}

class General {
    constructor(side) {
        this.side = side;
        this.brigades = [];
        this.lastUpdate = 0;
    }

    createBrigade(id, type) {
        const b = new Brigada(this, id, type);
        this.brigades.push(b);
        return b;
    }

    update(now, enemyGeneral) {
        if (now - this.lastUpdate < CONFIG.AI_GENERAL_UPDATE_MS) return;
        this.lastUpdate = now;

        // General AI: just tracks which enemy brigade is closest (for HUD info)
        for (const b of this.brigades) {
            if (b.state === 'FLEEING' || b.state === 'DESTROYED') continue;
            
            if (!b.targetBrigade || b.targetBrigade.state === 'FLEEING' || b.targetBrigade.state === 'DESTROYED') {
                let closest = null;
                let minDist = Infinity;
                
                for (const eb of enemyGeneral.brigades) {
                    if (eb.state !== 'FLEEING' && eb.state !== 'DESTROYED' && eb.formations.length > 0 && b.formations.length > 0) {
                        const dist = b.formations[0].centerPosition.distanceToSquared(eb.formations[0].centerPosition);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = eb;
                        }
                    }
                }
                
                if (closest) {
                    b.targetBrigade = closest;
                }
            }
        }
    }
}

class AICommander {
    constructor() {
        this.knightGeneral = new General('knight');
        this.goblinGeneral = new General('goblin');
    }

    update(now) {
        if (PerformanceProfiler) PerformanceProfiler.start('ia_commander');
        
        this.knightGeneral.update(now, this.goblinGeneral);
        this.goblinGeneral.update(now, this.knightGeneral);
        
        for (const b of this.knightGeneral.brigades) {
            b.update(now);
        }
        for (const b of this.goblinGeneral.brigades) {
            b.update(now);
        }
        
        // Update HUD with observed states
        if (window.HUD && window.HUD.updateAIStatus) {
            const kb = this.knightGeneral.brigades[0];
            const kf = kb && kb.formations[0];
            window.HUD.updateAIStatus('knights', 'COMANDO', kb ? kb.state : 'N/A', kf ? kf.type.toUpperCase() : 'N/A');

            const gb = this.goblinGeneral.brigades[0];
            const gf = gb && gb.formations[0];
            window.HUD.updateAIStatus('goblins', 'COMANDO', gb ? gb.state : 'N/A', gf ? gf.type.toUpperCase() : 'N/A');
        }

        if (PerformanceProfiler) PerformanceProfiler.end('ia_commander');
    }
}

window.AICommanderSystem = new AICommander();

window.setBrigadeOrder = function(order) {
    if (!window.selectedBrigadeId) return;
    
    // Find brigade
    const b = window.AICommanderSystem.knightGeneral.brigades.find(br => br.id === window.selectedBrigadeId);
    if (b) {
        b.order = order;
        if (window.HUD && window.HUD.updateBrigadeCardIcon) {
            window.HUD.updateBrigadeCardIcon(b.id, order);
        }
    }
    
    // Hide context menu
    if (window.HUD && window.HUD.elements.orderContextMenu) {
        window.HUD.elements.orderContextMenu.classList.add('hidden');
    }
    document.querySelectorAll('.indicator-select').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.group-card-blue').forEach(el => el.classList.remove('ring-2', 'ring-amber-500'));
    window.selectedBrigadeId = null;
};

window.randomizeCPUOrders = function() {
    window.AICommanderSystem.goblinGeneral.brigades.forEach(b => {
        // Exemplo: 70% chance de avançar, 30% chance de aguardar defensivamente
        b.order = Math.random() < 0.7 ? 'ADVANCE' : 'WAIT';
    });
    if (window.HUD && window.HUD.renderGroups) {
        window.HUD.renderGroups('goblins', window.AICommanderSystem.goblinGeneral.brigades);
    }
};
