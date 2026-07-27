/**
 * AI Commander System (Hybrid Layered AI - Battle-AI Spec)
 * General -> Brigada -> Formacao -> Soldado
 * 
 * Estrutura de 4 camadas:
 * 1. General: Avaliação estratégica global (2-3s)
 * 2. Comandante: Tradução de ordens em movimentação/waypoints de brigada (250ms)
 * 3. Formação: Manutenção de coesão, direção e grade de vagas/slots (100ms)
 * 4. Soldado: Reação local e execução em warrior.js
 */

class Formacao {
    constructor(brigada) {
        this.brigada = brigada;
        this.soldiers = [];
        this.type = 'block'; // 'block', 'line', 'wedge'
        this.lastUpdate = 0;
        this.cohesion = 100;
        this.centerPosition = new THREE.Vector3();
        this.direction = new THREE.Vector3(0, 0, 1);
    }

    addSoldier(soldier) {
        this.soldiers.push(soldier);
        soldier.formation = this;
    }

    reorganizeSlots() {
        const activeSoldiers = this.soldiers.filter(s => !s.isDead && !s.isFleeing);
        if (activeSoldiers.length === 0) return;

        const colsPerBlock = CONFIG.UNITS_COLS_PER_BLOCK || 10;
        const spacingX = CONFIG.UNITS_SPACING_X || 2.5;
        const spacingZ = CONFIG.UNITS_SPACING_Z || 2.5;

        const dirX = this.direction.x || 0;
        const dirZ = this.direction.z || 1;
        const perpX = -dirZ;
        const perpZ = dirX;

        let anchorX = this.centerPosition.x;
        let anchorZ = this.centerPosition.z;

        if (this.brigada && this.brigada.order === 'MOVE_TO' && this.brigada.customDestination) {
            anchorX = this.centerPosition.x + dirX * 4.0;
            anchorZ = this.centerPosition.z + dirZ * 4.0;
        }

        for (let i = 0; i < activeSoldiers.length; i++) {
            const s = activeSoldiers[i];
            const row = Math.floor(i / colsPerBlock);
            const col = i % colsPerBlock;
            const colOffset = (col - (colsPerBlock - 1) / 2) * spacingZ;
            const rowOffset = row * spacingX;

            const slotX = anchorX + dirX * rowOffset + perpX * colOffset;
            const slotZ = anchorZ + dirZ * rowOffset + perpZ * colOffset;

            if (!s.formationTarget) {
                s.formationTarget = new THREE.Vector3();
            }
            s.formationTarget.set(slotX, s.y || (s.terrainY !== undefined ? s.terrainY + 1.5 : 0), slotZ);
        }
    }

    update(now) {
        if (now - this.lastUpdate < CONFIG.AI_FORMACAO_UPDATE_MS) return;
        this.lastUpdate = now;

        const activeSoldiers = this.soldiers.filter(s => !s.isDead);
        if (activeSoldiers.length === 0) return;

        // Calcular centro dos soldados vivos
        this.centerPosition.set(0, 0, 0);
        for (const s of activeSoldiers) {
            this.centerPosition.x += s.x;
            this.centerPosition.y += s.y;
            this.centerPosition.z += s.z;
        }
        this.centerPosition.divideScalar(activeSoldiers.length);

        // Calcular coesão da formação
        if (activeSoldiers.length > 1) {
            let totalSpread = 0;
            for (const s of activeSoldiers) {
                const dx = s.x - this.centerPosition.x;
                const dz = s.z - this.centerPosition.z;
                totalSpread += Math.hypot(dx, dz);
            }
            const avgSpread = totalSpread / activeSoldiers.length;
            this.cohesion = Math.max(0, Math.min(100, 100 - avgSpread * 2));
        }

        // Reorganizar alinhamento de vagas (Slots)
        this.reorganizeSlots();
    }
}

class Brigada {
    constructor(general, id, type) {
        this.general = general;
        this.id = id;
        this.type = type; // 'MELEE', 'ARCHER', 'CATAPULT'
        this.formations = [];
        this.lastUpdate = 0;
        this.targetPosition = new THREE.Vector3();
        this.targetBrigade = null;
        this.state = 'IDLE'; // IDLE, MARCHING, REPOSITIONING, PREPARING_COMBAT, COMBATING, PURSUE, REGROUPING, RETREATING, FLEEING, DESTROYED
        this.order = 'WAIT'; // WAIT, ADVANCE, RETREAT, DEFEND, FLANK_LEFT, FLANK_RIGHT, BOMBARD, FOCUS_FIRE, REGROUP, PURSUE
        this.morale = 100;
        this.initialSoldierCount = 0;
        this.flankWaypoint = null;
        this.reachedFlankWaypoint = false;
    }

    createFormation() {
        const f = new Formacao(this);
        this.formations.push(f);
        return f;
    }

    getAliveSoldiers() {
        let count = 0;
        for (const f of this.formations) {
            for (const s of f.soldiers) {
                if (!s.isDead) count++;
            }
        }
        return count;
    }

    update(now) {
        if (now - this.lastUpdate < CONFIG.AI_BRIGADA_UPDATE_MS) return;
        this.lastUpdate = now;

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

        if (this.initialSoldierCount === 0 && alive > 0) {
            this.initialSoldierCount = alive;
        }

        if (alive === 0) {
            this.state = 'DESTROYED';
            return;
        }

        // --- SISTEMA DE MORAL (Etapa 7) ---
        if (this.initialSoldierCount > 0) {
            const casualtyRatio = (this.initialSoldierCount - alive) / this.initialSoldierCount;
            let currentMorale = 100 - casualtyRatio * 75;

            if (fleeing > 0) {
                currentMorale -= (fleeing / alive) * 30;
            }

            this.morale = Math.max(0, Math.min(100, Math.round(currentMorale)));
        }

        // Se a moral zerar ou cair abaixo do limite, debandar a brigada
        if (this.morale < (CONFIG.MORALE_FLEE_THRESHOLD || 20)) {
            this.state = 'FLEEING';
            for (const f of this.formations) {
                for (const s of f.soldiers) {
                    if (!s.isDead) s.isFleeing = true;
                }
            }
            return;
        }

        // --- MÁQUINA DE ESTADOS DO COMANDANTE (Etapas 4 e 11) ---
        if (this.order === 'WAIT' || this.order === 'DEFEND') {
            this.state = fighting > 0 ? 'COMBATING' : 'IDLE';
        } else if (this.order === 'RETREAT') {
            this.state = 'RETREATING';
        } else if (this.order === 'FLANK_LEFT' || this.order === 'FLANK_RIGHT') {
            if (!this.reachedFlankWaypoint) {
                this.state = 'REPOSITIONING';
            } else {
                this.state = fighting > 0 ? 'COMBATING' : 'MARCHING';
            }
        } else if (this.order === 'PURSUE') {
            this.state = 'PURSUE';
        } else if (this.order === 'MOVE_TO') {
            this.state = fighting > 0 ? 'COMBATING' : 'MARCHING';
        } else {
            this.state = fighting > 0 ? 'COMBATING' : 'MARCHING';
        }

        // Orientar a direção das formações com base no alvo / waypoints
        if (this.order === 'MOVE_TO' && this.formations.length > 0) {
            const firstForm = this.formations[0];
            if (firstForm.centerPosition && firstForm.direction) {
                if (this.pathWaypoints && this.pathWaypoints.length > 0) {
                    if (this.currentWaypointIndex === undefined || this.currentWaypointIndex < 0) {
                        this.currentWaypointIndex = 0;
                    }
                    let targetWp = this.pathWaypoints[this.currentWaypointIndex];
                    
                    while (targetWp && firstForm.centerPosition.distanceTo(targetWp) < 4.5) {
                        this.currentWaypointIndex++;
                        targetWp = this.pathWaypoints[this.currentWaypointIndex];
                    }
                    
                    if (targetWp) {
                        this.customDestination = targetWp;
                        const dir = _tmpVec3A.subVectors(targetWp, firstForm.centerPosition).normalize();
                        if (dir.lengthSq() > 0.001) {
                            for (const f of this.formations) {
                                f.direction.copy(dir);
                            }
                        }
                    } else {
                        this.order = 'WAIT';
                        this.pathWaypoints = null;
                        this.customDestination = null;
                        for (const f of this.formations) {
                            f.reorganizeSlots();
                            for (const s of f.soldiers) {
                                if (s && !s.isDead) {
                                    s.stateDirty = true;
                                    s.lastVelocity.set(0, 0, 0);
                                    s.isTryingToMove = false;
                                    s.currentState = 'WAITING';
                                }
                            }
                        }
                        if (window.HUD && window.HUD.updateBrigadeCardIcon) {
                            window.HUD.updateBrigadeCardIcon(this.id, 'WAIT');
                        }
                    }
                } else if (this.customDestination) {
                    const dir = _tmpVec3A.subVectors(this.customDestination, firstForm.centerPosition).normalize();
                    if (dir.lengthSq() > 0.001) {
                        for (const f of this.formations) {
                            f.direction.copy(dir);
                        }
                    }
                }
            }
        } else if (this.targetBrigade && this.formations.length > 0) {
            const firstForm = this.formations[0];
            if (firstForm.centerPosition && firstForm.direction) {
                let targetPos = (this.targetBrigade.formations[0] && this.targetBrigade.formations[0].centerPosition) ? this.targetBrigade.formations[0].centerPosition : this.targetPosition;

                // Lógica de Flanqueamento: definir waypoint lateral antes de engajar
                if ((this.order === 'FLANK_LEFT' || this.order === 'FLANK_RIGHT') && !this.reachedFlankWaypoint) {
                    const sideMultiplier = this.order === 'FLANK_LEFT' ? -1 : 1;
                    const offsetZ = sideMultiplier * (sizeZ * 0.35);
                    const waypointX = (this.general.side === 'knight' ? 1 : -1) * (sizeX * 0.1);

                    if (!this.flankWaypoint) {
                        this.flankWaypoint = new THREE.Vector3(waypointX, 0, offsetZ);
                    }
                    targetPos = this.flankWaypoint;

                    if (firstForm.centerPosition.distanceTo(targetPos) < 15.0) {
                        this.reachedFlankWaypoint = true;
                    }
                }

                const dir = _tmpVec3A.subVectors(targetPos, firstForm.centerPosition).normalize();
                if (dir.lengthSq() > 0.001) {
                    firstForm.direction.copy(dir);
                }
            }
        }

        // Atualizar todas as formações
        for (const f of this.formations) {
            if (f && typeof f.update === 'function') {
                f.update(now);
            }
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

        const activeBrigades = this.brigades.filter(b => b.state !== 'FLEEING' && b.state !== 'DESTROYED');
        if (activeBrigades.length === 0) return;

        // --- AVALIAÇÃO ESTRATÉGICA DO GENERAL (Etapa 3) ---
        let totalMyAlive = 0;
        let totalEnemyAlive = 0;
        for (const b of activeBrigades) totalMyAlive += b.getAliveSoldiers();
        for (const eb of enemyGeneral.brigades) {
            if (eb.state !== 'FLEEING' && eb.state !== 'DESTROYED') {
                totalEnemyAlive += eb.getAliveSoldiers();
            }
        }

        const numericRatio = totalEnemyAlive > 0 ? totalMyAlive / totalEnemyAlive : 2.0;

        // Se for o General da CPU (Goblins), toma decisões estratégicas automáticas
        if (this.side === 'goblin') {
            for (const b of activeBrigades) {
                if (numericRatio < 0.45 && b.morale < 50) {
                    b.order = 'RETREAT';
                } else if (totalEnemyAlive > 0 && totalEnemyAlive < 15) {
                    b.order = 'PURSUE';
                } else if (b.type === 'ARCHER') {
                    b.order = 'FOCUS_FIRE';
                } else if (b.type === 'CATAPULT') {
                    b.order = 'BOMBARD';
                }
            }

            // Oportunidade de Flanqueamento (Etapa 8)
            const enemyInfantryEngaged = enemyGeneral.brigades.some(eb => eb.type === 'MELEE' && eb.state === 'COMBATING');
            if (enemyInfantryEngaged) {
                const freeMelee = activeBrigades.find(b => b.type === 'MELEE' && b.state === 'MARCHING' && b.order === 'ADVANCE');
                if (freeMelee) {
                    freeMelee.order = Math.random() < 0.5 ? 'FLANK_LEFT' : 'FLANK_RIGHT';
                    freeMelee.reachedFlankWaypoint = false;
                    freeMelee.flankWaypoint = null;
                }
            }
        }

        // Atribuir brigada-alvo mais próxima
        for (const b of activeBrigades) {
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
        if (typeof PerformanceProfiler !== 'undefined') PerformanceProfiler.start('ia_commander');

        this.knightGeneral.update(now, this.goblinGeneral);
        this.goblinGeneral.update(now, this.knightGeneral);

        for (const b of this.knightGeneral.brigades) {
            b.update(now);
        }
        for (const b of this.goblinGeneral.brigades) {
            b.update(now);
        }

        if (window.HUD && window.HUD.updateAIStatus) {
            const kb = this.knightGeneral.brigades[0];
            const kf = kb && kb.formations[0];
            window.HUD.updateAIStatus('knights', 'COMANDO', kb ? kb.state : 'N/A', kf ? kf.type.toUpperCase() : 'N/A');

            const gb = this.goblinGeneral.brigades[0];
            const gf = gb && gb.formations[0];
            window.HUD.updateAIStatus('goblins', 'COMANDO', gb ? gb.state : 'N/A', gf ? gf.type.toUpperCase() : 'N/A');
        }

        if (typeof PerformanceProfiler !== 'undefined') PerformanceProfiler.end('ia_commander');
    }
}

window.AICommanderSystem = new AICommander();

window.setBrigadeOrder = function(order) {
    if (!window.selectedBrigadeId) return;

    const b = window.AICommanderSystem.knightGeneral.brigades.find(br => br.id === window.selectedBrigadeId);
    if (b) {
        b.order = order;
        b.reachedFlankWaypoint = false;
        b.flankWaypoint = null;
        if (window.HUD && window.HUD.updateBrigadeCardIcon) {
            window.HUD.updateBrigadeCardIcon(b.id, order);
        }
    }

    if (window.HUD && window.HUD.elements && window.HUD.elements.orderContextMenu) {
        window.HUD.elements.orderContextMenu.classList.add('hidden');
    }
    document.querySelectorAll('.indicator-select').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.group-card-blue').forEach(el => el.classList.remove('ring-2', 'ring-amber-500'));
    window.selectedBrigadeId = null;
};

window.setBrigadeMoveTo = function(brigadeId, tx, tz) {
    const b = window.AICommanderSystem.knightGeneral.brigades.find(br => br.id === brigadeId);
    if (b) {
        b.order = 'MOVE_TO';
        b.customDestination = new THREE.Vector3(tx, 0, tz);
        b.pathWaypoints = [b.customDestination];
        b.currentWaypointIndex = 0;
        b.reachedFlankWaypoint = false;
        b.flankWaypoint = null;
        if (window.HUD && window.HUD.updateBrigadeCardIcon) {
            window.HUD.updateBrigadeCardIcon(b.id, 'MOVE_TO');
        }
    }
};

window.setBrigadeWaypoints = function(brigadeId, waypoints) {
    const b = window.AICommanderSystem.knightGeneral.brigades.find(br => br.id === brigadeId);
    if (b && waypoints && waypoints.length > 0) {
        b.order = 'MOVE_TO';
        b.pathWaypoints = waypoints;
        b.currentWaypointIndex = 0;
        b.customDestination = waypoints[0];
        b.reachedFlankWaypoint = false;
        b.flankWaypoint = null;

        for (const f of b.formations) {
            f.reorganizeSlots();
            for (const s of f.soldiers) {
                if (s && !s.isDead) {
                    s.stateDirty = true;
                    s.isTryingToMove = true;
                }
            }
        }

        if (window.HUD && window.HUD.updateBrigadeCardIcon) {
            window.HUD.updateBrigadeCardIcon(b.id, 'MOVE_TO');
        }
    }
};

window.randomizeCPUOrders = function() {
    window.AICommanderSystem.goblinGeneral.brigades.forEach(b => {
        b.order = Math.random() < 0.7 ? 'ADVANCE' : 'WAIT';
    });
    if (window.HUD && window.HUD.renderGroups) {
        window.HUD.renderGroups('goblins', window.AICommanderSystem.goblinGeneral.brigades);
    }
};

window.getBrigadeCenter = function(b) {
    if (!b) return new THREE.Vector3(0, 0, 0);
    const center = new THREE.Vector3(0, 0, 0);
    let count = 0;
    if (b.formations && b.formations.length > 0) {
        for (const f of b.formations) {
            if (f && f.soldiers) {
                for (const s of f.soldiers) {
                    if (s && !s.isDead) {
                        center.x += s.x;
                        center.y += (s.terrainY !== undefined ? s.terrainY : (s.y ? s.y - 1.5 : 0));
                        center.z += s.z;
                        count++;
                    }
                }
            }
        }
    }
    if (count === 0 && window.battleManager && window.battleManager.getCatapults) {
        const catapults = window.battleManager.getCatapults();
        for (const c of catapults) {
            if (c && (c.brigada === b || (c.brigada && c.brigada.id === b.id)) && !c.isDead) {
                center.x += c.x;
                center.y += (c.terrainY !== undefined ? c.terrainY : 0);
                center.z += c.z;
                count++;
            }
        }
    }
    if (count > 0) {
        center.divideScalar(count);
        if (b.formations && b.formations[0]) {
            if (!b.formations[0].centerPosition) {
                b.formations[0].centerPosition = new THREE.Vector3();
            }
            b.formations[0].centerPosition.copy(center);
        }
        return center;
    }
    if (b.formations && b.formations[0] && b.formations[0].centerPosition && (b.formations[0].centerPosition.x !== 0 || b.formations[0].centerPosition.z !== 0)) {
        return b.formations[0].centerPosition.clone();
    }
    return new THREE.Vector3(0, 0, 0);
};

