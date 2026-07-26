// --- CALCULA DISTÂNCIA AO QUADRADO ENTRE UM PONTO EM 2D E UM TRONCO (SEGMENTO DE RETA) ---
function checkPointToLogDistanceSq(px, pz, log) {
    const abx = log.bx - log.ax;
    const abz = log.bz - log.az;
    const apx = px - log.ax;
    const apz = pz - log.az;

    const ab2 = abx * abx + abz * abz;
    if (ab2 === 0) return Infinity;

    let t = (apx * abx + apz * abz) / ab2;
    t = Math.max(0, Math.min(1, t)); // Mantém restrito ao comprimento do tronco

    const cx = log.ax + t * abx;
    const cz = log.az + t * abz;

    const dx = px - cx;
    const dz = pz - cz;
    return dx * dx + dz * dz;
}

// --- RESOLUÇÃO DE COLISÃO RÍGIDA COM OS TRONCOS E ÁRVORES DE PÉ (Empurrão Físico Final) ---
function resolveLogCollisions(warrior) {
    if (warrior.isDead) return;
    if (warrior.lodLevel >= 1) return; // Skip rigid tree/log collision for medium and far units!
    // Se o guerreiro não está se movendo ativamente, só atualiza colisão de árvores a cada 3 frames
    if (!warrior.isTryingToMove && (warrior.uid + (window.simulationFrame || 0)) % 3 !== 0) return;
    const p = warrior;
    const px = p.x;
    const pz = p.z;
    const r = warrior.radius;

    // 1. Colisões com troncos caídos — pré-filtra por AABB para saltar troncos distantes
    for (let i = 0; i < fallenLogs.length; i++) {
        const log = fallenLogs[i];
        const quickDx = px - log.x;
        const quickDz = pz - log.z;
        const quickDistSq = quickDx * quickDx + quickDz * quickDz;
        const quickMaxDist = r + log.radius + log.length * 0.5 + 1.0;
        if (quickDistSq > quickMaxDist * quickMaxDist) continue; // Muito longe, salta

        const distSq = checkPointToLogDistanceSq(px, pz, log);
        const minDist = r + log.radius;

        if (distSq < minDist * minDist) {
            const abx = log.bx - log.ax;
            const abz = log.bz - log.az;
            const apx = px - log.ax;
            const apz = pz - log.az;
            const ab2 = abx * abx + abz * abz;
            if (ab2 === 0) continue;
            let t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / ab2));
            const cx = log.ax + t * abx;
            const cz = log.az + t * abz;
            const dx = px - cx;
            const dz = pz - cz;

            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
                const overlap = minDist - dist;
                p.x += (dx / dist) * overlap;
                p.z += (dz / dist) * overlap;
            } else {
                p.x += (fastRandom() - 0.5) * 0.15;
                p.z += (fastRandom() - 0.5) * 0.15;
            }
        }
    }

    // 2. Colisões com árvores de pé — otimizado com spatial grid lazy-loaded
    if (window._lastTreeCount !== treePositions.length || !window._treeGrid) {
        window._treeGridSize = 20;
        window._treeGridCols = Math.ceil((1000 + 100) / window._treeGridSize);
        window._treeGridRows = Math.ceil((1000 + 100) / window._treeGridSize);
        window._treeGrid = Array.from({ length: window._treeGridCols * window._treeGridRows }, () => []);
        const halfX = 500 + 50;
        const halfZ = 500 + 50;
        for (let i = 0; i < treePositions.length; i++) {
            const tree = treePositions[i];
            const col = Math.max(0, Math.min(window._treeGridCols - 1, Math.floor((tree.x + halfX) / window._treeGridSize)));
            const row = Math.max(0, Math.min(window._treeGridRows - 1, Math.floor((tree.z + halfZ) / window._treeGridSize)));
            const idx = col + row * window._treeGridCols;
            window._treeGrid[idx].push(tree);
        }
        window._lastTreeCount = treePositions.length;
    }

    const minDistTree = r + 0.65;
    const minDistTreeSq = minDistTree * minDistTree;
    
    const halfX = 500 + 50;
    const halfZ = 500 + 50;
    const wCol = Math.max(0, Math.min(window._treeGridCols - 1, Math.floor((px + halfX) / window._treeGridSize)));
    const wRow = Math.max(0, Math.min(window._treeGridRows - 1, Math.floor((pz + halfZ) / window._treeGridSize)));
    
    for (let cOff = -1; cOff <= 1; cOff++) {
        for (let rOff = -1; rOff <= 1; rOff++) {
            const c = wCol + cOff;
            const rCell = wRow + rOff;
            if (c < 0 || c >= window._treeGridCols || rCell < 0 || rCell >= window._treeGridRows) continue;
            
            const cell = window._treeGrid[c + rCell * window._treeGridCols];
            for (let i = 0; i < cell.length; i++) {
                const tree = cell[i];
                const dx = px - tree.x;
                const dz = pz - tree.z;
                if (dx < minDistTree && dx > -minDistTree && dz < minDistTree && dz > -minDistTree) {
                    const distSq = dx * dx + dz * dz;
                    if (distSq < minDistTreeSq) {
                        const dist = Math.sqrt(distSq);
                        if (dist > 0.0001) {
                            const overlap = minDistTree - dist;
                            p.x += (dx / dist) * overlap;
                            p.z += (dz / dist) * overlap;
                        } else {
                            p.x += (fastRandom() - 0.5) * 0.15;
                            p.z += (fastRandom() - 0.5) * 0.15;
                        }
                    }
                }
            }
        }
    }
}

// --- COLISÃO DA TRAJETÓRIA DA FLECHA COM OS TRONCOS ---
function checkArrowLogCollision(arrow) {
    const py = arrow.y;
    if (py > 3.5) return false; // QUICK BYPASS: Fallen logs are on the ground!
    const px = arrow.x;
    const pz = arrow.z;

    for (let i = 0; i < fallenLogs.length; i++) {
        const log = fallenLogs[i];

        const dist2DSq = checkPointToLogDistanceSq(px, pz, log);
        const minDist = 0.4 + log.radius;

        if (dist2DSq < minDist * minDist) {
            if (Math.abs(py - log.y) < log.radius + 0.8) {
                return true;
            }
        }
    }
    return false;
}

function checkArrowTreeCollision(arrow) {
    const px = arrow.x;
    const py = arrow.y;
    const pz = arrow.z;

    if (window._treeGrid) {
        const halfX = 500 + 50;
        const halfZ = 500 + 50;
        const wCol = Math.max(0, Math.min(window._treeGridCols - 1, Math.floor((px + halfX) / window._treeGridSize)));
        const wRow = Math.max(0, Math.min(window._treeGridRows - 1, Math.floor((pz + halfZ) / window._treeGridSize)));
        
        for (let cOff = -1; cOff <= 1; cOff++) {
            for (let rOff = -1; rOff <= 1; rOff++) {
                const c = wCol + cOff;
                const r = wRow + rOff;
                if (c < 0 || c >= window._treeGridCols || r < 0 || r >= window._treeGridRows) continue;
                
                const cell = window._treeGrid[c + r * window._treeGridCols];
                for (let i = 0; i < cell.length; i++) {
                    const tree = cell[i];
                    const dx = px - tree.x;
                    const dz = pz - tree.z;
                    const dist2DSq = dx * dx + dz * dz;

                    if (dist2DSq < 4.0) { // 2.0 * 2.0 = 4.0 (raio de 2m da copa/tronco)
                        if (py >= tree.y && py <= tree.y + 11.5) {
                            return true;
                        }
                    }
                }
            }
        }
    } else {
        for (let i = 0; i < treePositions.length; i++) {
            const tree = treePositions[i];
            const dx = px - tree.x;
            const dz = pz - tree.z;
            const dist2DSq = dx * dx + dz * dz;

            if (dist2DSq < 4.0) { // 2.0 * 2.0 = 4.0 (raio de 2m da copa/tronco)
                if (py >= tree.y && py <= tree.y + 11.5) {
                    return true;
                }
            }
        }
    }
    return false;
}

function checkNearTree(position, radius) {
    const checkRadius = radius || 4.5;
    const checkRadiusSq = checkRadius * checkRadius;

    if (window._treeGrid) {
        const halfX = 500 + 50;
        const halfZ = 500 + 50;
        const wCol = Math.max(0, Math.min(window._treeGridCols - 1, Math.floor((position.x + halfX) / window._treeGridSize)));
        const wRow = Math.max(0, Math.min(window._treeGridRows - 1, Math.floor((position.z + halfZ) / window._treeGridSize)));
        
        for (let cOff = -1; cOff <= 1; cOff++) {
            for (let rOff = -1; rOff <= 1; rOff++) {
                const c = wCol + cOff;
                const r = wRow + rOff;
                if (c < 0 || c >= window._treeGridCols || r < 0 || r >= window._treeGridRows) continue;
                
                const cell = window._treeGrid[c + r * window._treeGridCols];
                for (let i = 0; i < cell.length; i++) {
                    const dx = position.x - cell[i].x;
                    const dz = position.z - cell[i].z;
                    const distSq = dx * dx + dz * dz;
                    if (distSq < checkRadiusSq) {
                        return true;
                    }
                }
            }
        }
    } else {
        for (let i = 0; i < treePositions.length; i++) {
            const dx = position.x - treePositions[i].x;
            const dz = position.z - treePositions[i].z;
            const distSq = dx * dx + dz * dz;
            if (distSq < checkRadiusSq) {
                return true;
            }
        }
    }
    return false;
}

// --- 7. SISTEMA DE COLISÃO OTIMIZADO VIA SPATIAL GRID BUCKETING COM MULTI-PASS SUBSTEPPING ---
const GRID_CELL_SIZE = 5;
let GRID_COLS = 34;
let GRID_ROWS = 34;
let spatialGrid = Array.from({ length: GRID_COLS * GRID_ROWS }, () => []);
const allWarriors = [];
const activeCellIndices = [];

// Bounding box (em células) das posições ocupadas por cada facção, recalculada a
// cada populateSpatialGrid. Permite ao findNearestEnemyInGrid pular anéis vazios.
// Convenção: maxCol === -1 indica que a facção não tem unidades vivas no grid.
const gridFactionBounds = {
    knights: { minCol: 0, maxCol: -1, minRow: 0, maxRow: -1 },
    goblins: { minCol: 0, maxCol: -1, minRow: 0, maxRow: -1 }
};

// Expor variáveis críticas para escopo global do navegador
window.GRID_CELL_SIZE = GRID_CELL_SIZE;
window.GRID_COLS = GRID_COLS;
window.GRID_ROWS = GRID_ROWS;
window.spatialGrid = spatialGrid;
window.activeCellIndices = activeCellIndices;
window.allWarriors = allWarriors;
window.gridFactionBounds = gridFactionBounds;

function rebuildSpatialGrid() {
    window.GRID_COLS = Math.ceil((sizeX + 20) / window.GRID_CELL_SIZE);
    window.GRID_ROWS = Math.ceil((sizeZ + 20) / window.GRID_CELL_SIZE);
    window.spatialGrid = Array.from({ length: window.GRID_COLS * window.GRID_ROWS }, () => []);
    spatialGrid = window.spatialGrid;
    window.activeCellIndices.length = 0;
}

// Preenche o Grid Espacial uma vez por frame para IA e Colisões
window.populateSpatialGrid = function() {
    // 1. Limpa o grid usando os índices que foram ativos no frame anterior
    const activeLen = window.activeCellIndices.length;
    for (let k = 0; k < activeLen; k++) {
        const idx = window.activeCellIndices[k];
        if (window.spatialGrid[idx]) {
            window.spatialGrid[idx].length = 0;
        }
    }
    window.activeCellIndices.length = 0;
    window.allWarriors.length = 0;

    const knights = battleManager.getKnights();
    const goblins = battleManager.getGoblins();

    const kLen = knights.length;
    const gLen = goblins.length;

    // Adiciona apenas guerreiros vivos ao grid
    for (let i = 0; i < kLen; i++) {
        const w = knights[i];
        if (!w.isDead) {
            window.allWarriors.push(w);
        }
    }
    for (let i = 0; i < gLen; i++) {
        const w = goblins[i];
        if (!w.isDead) {
            window.allWarriors.push(w);
        }
    }

    const length = window.allWarriors.length;

    // Reseta o bounding box de cada facção (maxCol === -1 = facção ausente do grid)
    gridFactionBounds.knights.maxCol = -1;
    gridFactionBounds.goblins.maxCol = -1;

    if (length === 0) return;

    const halfX = sizeX / 2 + 10;
    const halfZ = sizeZ / 2 + 10;

    for (let i = 0; i < length; i++) {
        const w = window.allWarriors[i];
        const col = Math.max(0, Math.min(window.GRID_COLS - 1, Math.floor((w.x + halfX) / window.GRID_CELL_SIZE)));
        const row = Math.max(0, Math.min(window.GRID_ROWS - 1, Math.floor((w.z + halfZ) / window.GRID_CELL_SIZE)));
        const index = col + row * window.GRID_COLS;
        const cell = window.spatialGrid[index];
        if (cell.length === 0) {
            window.activeCellIndices.push(index);
        }
        cell.push(w);

        // Atualiza o bounding box da facção
        const fb = gridFactionBounds[w.faction];
        if (fb) {
            if (fb.maxCol === -1) {
                fb.minCol = fb.maxCol = col;
                fb.minRow = fb.maxRow = row;
            } else {
                if (col < fb.minCol) fb.minCol = col;
                if (col > fb.maxCol) fb.maxCol = col;
                if (row < fb.minRow) fb.minRow = row;
                if (row > fb.maxRow) fb.maxRow = row;
            }
        }
    }
};

// Busca pelo inimigo vivo mais próximo usando o Grid Espacial em O(1) médio
window.findNearestEnemyInGrid = function(warrior) {
    const px = warrior.x;
    const pz = warrior.z;
    const halfX = sizeX / 2 + 10;
    const halfZ = sizeZ / 2 + 10;

    const col = Math.max(0, Math.min(window.GRID_COLS - 1, Math.floor((px + halfX) / window.GRID_CELL_SIZE)));
    const row = Math.max(0, Math.min(window.GRID_ROWS - 1, Math.floor((pz + halfZ) / window.GRID_CELL_SIZE)));

    let bestTarget = null;
    let bestScore = Infinity;
    let bestOccupiedTarget = null;
    let bestOccupiedScore = Infinity;
    // Último recurso: inimigos saturados (≥6 atacantes). Só usado quando não há
    // nenhuma alternativa menos disputada no raio de busca — ex: fim de batalha.
    let lastResortTarget = null;
    let lastResortScore = Infinity;

    // Busca em anéis concêntricos ao redor da unidade
    const maxRing = 20; // Máximo de 20 células de distância (~100 metros) para tropas que recuaram acharem o combate

    // Early-out via bounding box das células inimigas (calculada no populateSpatialGrid):
    // nenhum inimigo pode estar mais perto do que a distância (Chebyshev) até a bbox,
    // então a busca começa direto no anel correto, sem varrer anéis vazios.
    const enemyFactionKey = warrior.faction === 'knights' ? 'goblins' : 'knights';
    const eb = window.gridFactionBounds ? window.gridFactionBounds[enemyFactionKey] : null;
    let startRing = 0;
    if (eb) {
        if (eb.maxCol === -1) {
            startRing = maxRing + 1; // Sem inimigos vivos no grid: pula a busca em anéis
        } else {
            const dCol = Math.max(eb.minCol - col, col - eb.maxCol, 0);
            const dRow = Math.max(eb.minRow - row, row - eb.maxRow, 0);
            startRing = Math.max(dCol, dRow);
            if (startRing > 0) startRing--; // Margem de segurança de 1 anel
        }
    }

    for (let ring = startRing; ring <= maxRing; ring++) {
        let foundInRing = false;

        const minRow = Math.max(0, row - ring);
        const maxRow = Math.min(window.GRID_ROWS - 1, row + ring);
        const minCol = Math.max(0, col - ring);
        const maxCol = Math.min(window.GRID_COLS - 1, col + ring);

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                // Pula o miolo já investigado em anéis internos
                if (ring > 0 && r > minRow && r < maxRow && c > minCol && c < maxCol) {
                    continue;
                }

                const cellIndex = c + r * window.GRID_COLS;
                const cell = window.spatialGrid[cellIndex];
                if (!cell || cell.length === 0) continue;

                for (let i = 0; i < cell.length; i++) {
                    const enemy = cell[i];
                    if (enemy.isDead || enemy.faction === warrior.faction) continue;

                    const dx = enemy.x - px;
                    const dz = enemy.z - pz;
                    const distSq = dx * dx + dz * dz;

                    // Score com penalidade por aglomeração: distribui os atacantes
                    // pelos inimigos da linha de frente em vez de convergir todos
                    // para o mesmo alvo (evita o efeito "14x1"). Inimigos saturados
                    // (≥6 atacantes) vão para o último recurso e NÃO encerram a
                    // busca — o anel seguinte pode ter opções menos disputadas.
                    const atkSize = enemy.attackers ? enemy.attackers.size : 0;
                    if (atkSize >= 6 && !enemy.attackers.has(warrior)) {
                        const score = distSq * (1 + (atkSize - 5) * 0.8);
                        if (score < lastResortScore) {
                            lastResortScore = score;
                            lastResortTarget = enemy;
                        }
                        continue;
                    }
                    const isOccupied = (atkSize >= 3 && !enemy.attackers.has(warrior));
                    if (isOccupied) {
                        const score = distSq * (1 + (atkSize - 2) * 0.6);
                        if (score < bestOccupiedScore) {
                            bestOccupiedScore = score;
                            bestOccupiedTarget = enemy;
                        }
                    } else {
                        const score = distSq * (1 + atkSize * 0.35);
                        if (score < bestScore) {
                            bestScore = score;
                            bestTarget = enemy;
                            foundInRing = true;
                        }
                    }
                }
            }
        }

        // Se encontrou algum inimigo neste anel de proximidade, encerra a busca em anéis
        if (foundInRing || bestOccupiedTarget) {
            break;
        }
    }

    // Busca também nas catapultas inimigas (não estão no grid espacial)
    const catapults = battleManager.getCatapults();
    for(let i = 0; i < catapults.length; i++) {
        const cat = catapults[i];
        if (cat.isDead || cat.faction === warrior.faction) continue;
        const dx = cat.x - px;
        const dz = cat.z - pz;
        const distSq = dx * dx + dz * dz;
        // Apenas considera se estiver num raio razoável (ex: 100 metros)
        if (distSq > 10000) continue; 
        
        const atkSize = cat.attackers ? cat.attackers.size : 0;
        if (atkSize >= 6 && !cat.attackers.has(warrior)) {
            const score = distSq * (1 + (atkSize - 5) * 0.8);
            if (score < lastResortScore) {
                lastResortScore = score;
                lastResortTarget = cat;
            }
            continue;
        }
        const isOccupied = (atkSize >= 3 && !cat.attackers.has(warrior));
        if (isOccupied) {
            const score = distSq * (1 + (atkSize - 2) * 0.6);
            if (score < bestOccupiedScore) {
                bestOccupiedScore = score;
                bestOccupiedTarget = cat;
            }
        } else {
            const score = distSq * (1 + atkSize * 0.35);
            if (score < bestScore) {
                bestScore = score;
                bestTarget = cat;
            }
        }
    }

    return bestTarget || bestOccupiedTarget || lastResortTarget;
};

const _catapultHasTargetMap = new Map();

function isWarriorEngaged(w) {
    if (!w) return false;
    if (w.isDead) return false;
    if (w.role !== 'melee' && !w.isDaggerArcher) return false;
    if (!w.target || w.target.isDead) return false;

    const dx = w.target.x - w.x;
    const dz = w.target.z - w.z;
    const distSq = dx * dx + dz * dz;
    const targetRadius = w.target.radius || 0.8;
    const actualAttackRange = w.attackRange - 0.8 + targetRadius;
    const actualAttackRangeSq = actualAttackRange * actualAttackRange;

    return distSq <= actualAttackRangeSq;
}

function resolveWarriorCollisions() {
    if (simulationFrame % 2 !== 0) return;

    const catapults = battleManager.getCatapults();

    // Cache hasEnemyInRange por catapulta para evitar chamadas repetidas
    _catapultHasTargetMap.clear();
    const catapultHasTarget = _catapultHasTargetMap;
    for (let i = 0; i < catapults.length; i++) {
        const c = catapults[i];
        if (c.isDead) continue;
        const opp = window.armies[c.faction].enemies;
        catapultHasTarget.set(c, c.hasEnemyInRange(opp));
    }

    // Pré-calcula e armazena em cache o estado de engajamento de combate para TODOS os guerreiros vivos
    const allWarriorsLen = window.allWarriors.length;
    for (let i = 0; i < allWarriorsLen; i++) {
        const w = window.allWarriors[i];
        w._isEngagedCached = isWarriorEngaged(w);
    }

    const activeLen = window.activeCellIndices.length;
    for (let k = 0; k < activeLen; k++) {
        const index = window.activeCellIndices[k];
        const cellWarriors = window.spatialGrid[index];
        const col = index % window.GRID_COLS;
        const row = Math.floor(index / window.GRID_COLS);

        for (let d = 0; d < 5; d++) {
            let ox = 0, oz = 0;
            if (d === 1) { ox = 1; oz = 0; }
            else if (d === 2) { ox = 1; oz = 1; }
            else if (d === 3) { ox = 0; oz = 1; }
            else if (d === 4) { ox = -1; oz = 1; }

            const ncol = col + ox;
            const nrow = row + oz;
            if (ncol < 0 || ncol >= window.GRID_COLS || nrow < 0 || nrow >= window.GRID_ROWS) continue;

            const neighborIndex = ncol + nrow * window.GRID_COLS;
            const neighbors = window.spatialGrid[neighborIndex];
            const neighLen = neighbors.length;
            if (neighLen === 0) continue;

            const isSelf = (ox === 0 && oz === 0);
            const cellLen = cellWarriors.length;

            for (let i = 0; i < cellLen; i++) {
                const w1 = cellWarriors[i];
                if (w1.currentState === 'WAITING') {
                    if (window.blockStats) window.blockStats.avoidedCalcs++;
                    // continue; // Removed to fix collision phasing
                }
                if (w1.lodLevel >= 2) continue; // Pula colisão rígida para unidades muito distantes
                if (w1.isPusher && w1.catapult && !w1.catapult.isDead && !catapultHasTarget.get(w1.catapult)) continue;

                const p1 = w1;
                const r1 = w1.radius;
                const startJ = isSelf ? (i + 1) : 0;
                let checkedCount = 0;

                for (let j = startJ; j < neighLen; j++) {
                    const w2 = neighbors[j];
                    if (w1.uid === w2.uid) continue;
                    if (w2.lodLevel >= 2) continue; // Pula colisão rígida para unidades muito distantes
                    if (w2.isPusher && w2.catapult && !w2.catapult.isDead && !catapultHasTarget.get(w2.catapult)) continue;

                    checkedCount++;
                    if (checkedCount > 12) break;

                    const p2 = w2;
                    const dx = p2.x - p1.x;
                    const dz = p2.z - p1.z;
                    const minDistance = (r1 + w2.radius) * 1.1;

                    if (dx < minDistance && dx > -minDistance && dz < minDistance && dz > -minDistance) {
                        const distanceSq = dx * dx + dz * dz;
                        const minDistanceSq = minDistance * minDistance;

                        if (distanceSq < minDistanceSq && distanceSq > 0.0001) {
                            const distance = Math.sqrt(distanceSq);
                            const overlap = minDistance - distance;

                            // Distribuição dinâmica de forças baseada no estado de engajamento de combate pré-calculado
                            const eng1 = w1._isEngagedCached;
                            const eng2 = w2._isEngagedCached;

                            let f1 = 0.5;
                            let f2 = 0.5;

                            if (eng1 && eng2) {
                                // Ambos lutando: empurrão leve para manter separação mínima
                                f1 = 0.3;
                                f2 = 0.3;
                            } else if (eng1) {
                                // w1 está lutando (âncora estática), w2 está se movendo/procurando (absorve 100% do empurrão para desviar)
                                f1 = 0.0;
                                f2 = 1.0;
                            } else if (eng2) {
                                // w2 está lutando (âncora estática), w1 está se movendo/procurando (absorve 100% do empurrão para desviar)
                                f1 = 1.0;
                                f2 = 0.0;
                            }

                            if (f1 > 0 || f2 > 0) {
                                let shockMultiplier = 1.0;
                                // Se forem de facções diferentes, o choque é mais forte (impacto da carga/empurrão de formações)
                                if (w1.faction !== w2.faction) {
                                    shockMultiplier = 1.8;
                                }

                                const pushX = (dx / distance) * overlap * shockMultiplier;
                                const pushZ = (dz / distance) * overlap * shockMultiplier;

                                if (f1 > 0) {
                                    p1.x -= pushX * f1;
                                    p1.z -= pushZ * f1;
                                }
                                if (f2 > 0) {
                                    p2.x += pushX * f2;
                                    p2.z += pushZ * f2;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Empurra guerreiros para fora das catapultas ativas
    const length = window.allWarriors.length;
    for (let i = 0; i < length; i++) {
        const w = window.allWarriors[i];
        if (w.lodLevel >= 2) continue;
        const p1 = w;
        for (let j = 0; j < catapults.length; j++) {
            const cat = catapults[j];
            if (cat.isDead) continue;

            const cp = cat.mesh.position;
            const dx = p1.x - cp.x;
            const dz = p1.z - cp.z;
            const minDistance = w.radius + cat.radius;

            if (dx < minDistance && dx > -minDistance && dz < minDistance && dz > -minDistance) {
                const distanceSq = dx * dx + dz * dz;
                const minDistanceSq = minDistance * minDistance;

                if (distanceSq < minDistanceSq && distanceSq > 0.0001) {
                    const distance = Math.sqrt(distanceSq);
                    const overlap = minDistance - distance;
                    p1.x += (dx / distance) * overlap;
                    p1.z += (dz / distance) * overlap;
                }
            }
        }
    }
}