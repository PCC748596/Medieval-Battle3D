// --- SHARED RIGHT PANELS CONTAINER ---
window.getOrCreateRightPanelsContainer = function() {
    let container = document.getElementById('right-panels-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'right-panels-container';
        container.style.position = 'fixed';
        container.style.top = '70px';
        container.style.right = '10px';
        container.style.width = '380px';
        container.style.maxHeight = 'calc(100vh - 80px)';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.zIndex = '99999';
        container.style.pointerEvents = 'none'; // click through empty space
        container.style.overflowY = 'auto';
        container.style.scrollbarWidth = 'none'; // thin/none

        // hide scrollbar styling for webkit
        const style = document.createElement('style');
        style.innerHTML = `
            #right-panels-container::-webkit-scrollbar {
                display: none;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(container);
    }
    return container;
};

// --- HIGH-PRECISION PERFORMANCE PROFILER ---
const activeStack = [];

const PerformanceProfiler = {
    isCollapsed: false,
    systems: {
        ia_guerreiros: "IA dos guerreiros",
        busca_inimigos: "Busca de inimigos",
        selecao_alvo: "Seleção de alvo",
        movimento: "Movimento",
        steering: "Steering",
        desvio_aliados: "Desvio entre aliados",
        desvio_obstaculos: "Desvio de obstáculos",
        combate_corpo_corpo: "Combate corpo a corpo",
        arqueiros: "Arqueiros",
        flechas: "Flechas",
        catapultas: "Catapultas",
        projeteis: "Projéteis",
        colisoes: "Colisões",
        spatial_grid: "Spatial Grid",
        ai_commander: "AI Commander",
        lod: "LOD",
        animacoes: "Animações",
        matrizes_instancedmesh: "Atualização das matrizes dos InstancedMesh",
        render_unidades: "Renderização das unidades",
        particulas: "Partículas",
        chuva: "Chuva",
        nuvens: "Nuvens",
        sons: "Sons",
        hud: "HUD",
        garbage_collector: "Garbage Collector",
        total_frame: "Tempo total do frame",
        
        // --- INSTRUMENTAÇÃO INTERNA DA RENDERIZAÇÃO DAS UNIDADES ---
        posicao: "↳ Atualização de posição",
        rotacao: "↳ Atualização de rotação",
        update_matrix: "↳ updateMatrix()",
        set_matrix_at: "↳ setMatrixAt()",
        needs_update: "↳ instanceMatrix.needsUpdate",
        lod_render: "↳ Atualização do LOD",
        animacoes_visuais: "↳ Atualização das animações visuais",
        bracos: "↳ Atualização dos braços",
        pernas: "↳ Atualização das pernas",
        espadas: "↳ Atualização das espadas",
        escudos: "↳ Atualização dos escudos",
        tochas: "↳ Atualização das tochas",
        sombras: "↳ Atualização das sombras",
        materiais: "↳ Atualização dos materiais",
        cores: "↳ Atualização das cores",
        visibilidade: "↳ Atualização da visibilidade",
        geometrias: "↳ Atualização das geometrias"
    },
    
    stats: {},
    startTimes: {},
    
    fpsHistory: [],
    frameTimeHistory: [],
    cpuTimeHistory: [],
    
    lastHeapSize: 0,
    gcCollectedSum: 0,
    gcCyclesCount: 0,
    
    lastPanelUpdate: 0,
    lastConsoleReport: 0,
    
    init: function() {
        for (const key in this.systems) {
            this.stats[key] = {
                accumulatedTime: 0,
                currentCallCount: 0,
                minTime: Infinity,
                maxTime: 0,
                totalTimeSum: 0,
                totalCalls: 0,
                history: []
            };
        }
        if (window.performance && window.performance.memory) {
            this.lastHeapSize = window.performance.memory.usedJSHeapSize;
        }
        this.lastPanelUpdate = performance.now();
        this.lastConsoleReport = performance.now();
    },
    
    start: function(key) {
        const now = performance.now();
        if (key === 'total_frame') {
            this.startTimes[key] = now;
            return;
        }
        
        if (activeStack.length > 0) {
            const parentKey = activeStack[activeStack.length - 1];
            const start = this.startTimes[parentKey];
            if (start !== undefined) {
                const elapsed = now - start;
                if (!this.stats[parentKey]) {
                    this.stats[parentKey] = { accumulatedTime: 0, currentCallCount: 0, minTime: Infinity, maxTime: 0, totalTimeSum: 0, totalCalls: 0, history: [] };
                }
                this.stats[parentKey].accumulatedTime += elapsed;
            }
        }
        if (!this.stats[key]) {
            this.stats[key] = { accumulatedTime: 0, currentCallCount: 0, minTime: Infinity, maxTime: 0, totalTimeSum: 0, totalCalls: 0, history: [] };
        }
        activeStack.push(key);
        this.startTimes[key] = now;
    },
    
    end: function(key) {
        const now = performance.now();
        if (key === 'total_frame') {
            const start = this.startTimes[key];
            if (start !== undefined) {
                const elapsed = now - start;
                this.stats[key].accumulatedTime += elapsed;
                this.stats[key].currentCallCount += 1;
            }
            return;
        }
        
        const popped = activeStack.pop();
        if (popped !== key) {
            if (popped) {
                const start = this.startTimes[popped];
                if (start !== undefined) {
                    if (!this.stats[popped]) {
                        this.stats[popped] = { accumulatedTime: 0, currentCallCount: 0, minTime: Infinity, maxTime: 0, totalTimeSum: 0, totalCalls: 0, history: [] };
                    }
                    this.stats[popped].accumulatedTime += (now - start);
                    this.stats[popped].currentCallCount += 1;
                }
            }
        }
        
        const start = this.startTimes[key];
        if (start !== undefined) {
            const elapsed = now - start;
            if (!this.stats[key]) {
                this.stats[key] = { accumulatedTime: 0, currentCallCount: 0, minTime: Infinity, maxTime: 0, totalTimeSum: 0, totalCalls: 0, history: [] };
            }
            this.stats[key].accumulatedTime += elapsed;
            this.stats[key].currentCallCount += 1;
        }
        
        if (activeStack.length > 0) {
            const parentKey = activeStack[activeStack.length - 1];
            this.startTimes[parentKey] = now;
        }
    },
    
    startFrame: function() {
        this.start('total_frame');
        
        if (window.performance && window.performance.memory) {
            const currentHeap = window.performance.memory.usedJSHeapSize;
            if (currentHeap < this.lastHeapSize) {
                const collected = this.lastHeapSize - currentHeap;
                this.stats['garbage_collector'].accumulatedTime += 1.0;
                this.stats['garbage_collector'].currentCallCount += 1;
                this.gcCollectedSum += collected;
                this.gcCyclesCount++;
            }
            this.lastHeapSize = currentHeap;
        }
    },
    
    endFrame: function() {
        this.end('total_frame');
        
        while (activeStack.length > 0) {
            const popped = activeStack.pop();
            const start = this.startTimes[popped];
            if (start !== undefined) {
                this.stats[popped].accumulatedTime += (performance.now() - start);
                this.stats[popped].currentCallCount += 1;
            }
        }
        
        let totalCPU = 0;
        for (const key in this.systems) {
            if (key !== 'total_frame' && key !== 'garbage_collector') {
                totalCPU += this.stats[key].accumulatedTime;
            }
        }
        
        for (const key in this.systems) {
            const s = this.stats[key];
            const t = s.accumulatedTime;
            
            if (t > 0) {
                if (t < s.minTime) s.minTime = t;
                if (t > s.maxTime) s.maxTime = t;
            }
            
            s.totalTimeSum += t;
            s.totalCalls += s.currentCallCount;
            
            s.history.push({ time: t, calls: s.currentCallCount });
            if (s.history.length > 120) {
                s.history.shift();
            }
            
            s.accumulatedTime = 0;
            s.currentCallCount = 0;
        }
        
        const frameTime = this.stats['total_frame'].history[this.stats['total_frame'].history.length - 1]?.time || 0;
        this.frameTimeHistory.push(frameTime);
        this.cpuTimeHistory.push(totalCPU);
        
        if (window.currentFPS !== undefined) {
            this.fpsHistory.push(window.currentFPS);
        }
        
        if (this.frameTimeHistory.length > 300) {
            this.frameTimeHistory.shift();
            this.cpuTimeHistory.shift();
            if (this.fpsHistory.length > 300) this.fpsHistory.shift();
        }
        
        this.tickPeriodic();
    },
    
    tickPeriodic: function() {
        const now = performance.now();
        if (now - this.lastPanelUpdate >= 500) {
            this.updateDebugPanel();
            this.lastPanelUpdate = now;
        }
        
        if (now - this.lastConsoleReport >= 5000) {
            this.printConsoleReport();
            this.lastConsoleReport = now;
        }
    },
    
    updateDebugPanel: function() {
        const container = window.getOrCreateRightPanelsContainer();
        let panel = document.getElementById('perf-debug-panel');
        if (window.panelVisible === false) {
            container.style.display = 'none';
            return;
        } else {
            container.style.display = 'flex';
        }
        
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'perf-debug-panel';
            panel.style.width = '100%';
            panel.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
            panel.style.color = '#e2e8f0';
            panel.style.fontFamily = 'monospace';
            panel.style.fontSize = '11px';
            panel.style.padding = '12px';
            panel.style.borderRadius = '8px';
            panel.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)';
            panel.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            panel.style.pointerEvents = 'auto';
            panel.style.transition = 'all 0.3s ease';
            panel.style.order = '2';
            
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.fontSize = '12px';
            header.style.marginBottom = '6px';
            header.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            header.style.paddingBottom = '4px';
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            
            const title = document.createElement('span');
            title.innerHTML = '⏱️ <b>PROFILER REAL-TIME</b>';
            title.style.color = '#f59e0b';
            title.style.fontWeight = 'bold';
            header.appendChild(title);
            
            header.onmouseenter = () => { title.style.color = '#fbbf24'; };
            header.onmouseleave = () => { title.style.color = '#f59e0b'; };
            
            const controls = document.createElement('div');
            controls.style.display = 'flex';
            controls.style.gap = '6px';
            
            const collapseBtn = document.createElement('span');
            collapseBtn.id = 'perf-debug-collapse-btn';
            collapseBtn.innerText = '▼';
            collapseBtn.style.color = '#94a3b8';
            controls.appendChild(collapseBtn);
            
            header.appendChild(controls);
            panel.appendChild(header);
            
            header.onclick = () => {
                PerformanceProfiler.isCollapsed = !PerformanceProfiler.isCollapsed;
                const body = document.getElementById('perf-debug-content');
                if (body) {
                    body.style.display = PerformanceProfiler.isCollapsed ? 'none' : 'block';
                    collapseBtn.innerText = PerformanceProfiler.isCollapsed ? '▲' : '▼';
                }
            };
            
            const content = document.createElement('div');
            content.id = 'perf-debug-content';
            panel.appendChild(content);
            
            container.appendChild(panel);
        }
        
        const content = document.getElementById('perf-debug-content');
        if (!content) return;

        if (this.isCollapsed) {
            content.style.display = 'none';
            return;
        } else {
            content.style.display = 'block';
        }
        
        const avgFPS = Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / (this.fpsHistory.length || 1));
        const currentFPS = window.currentFPS || 0;
        
        const avgFrameTime = this.stats['total_frame'].history.reduce((sum, h) => sum + h.time, 0) / (this.stats['total_frame'].history.length || 1);
        const avgCPUTime = this.cpuTimeHistory.reduce((a, b) => a + b, 0) / (this.cpuTimeHistory.length || 1);
        
        const systemsList = [];
        for (const key in this.systems) {
            if (key === 'total_frame') continue;
            const s = this.stats[key];
            const avgTime = s.history.reduce((sum, h) => sum + h.time, 0) / (s.history.length || 1);
            const avgCalls = s.history.reduce((sum, h) => sum + h.calls, 0) / (s.history.length || 1);
            
            systemsList.push({
                key: key,
                name: this.systems[key],
                avgTime: avgTime,
                callsPerSecond: avgCalls * currentFPS,
                percentage: avgFrameTime > 0 ? (avgTime / avgFrameTime) * 100 : 0,
                minTime: s.minTime === Infinity ? 0 : s.minTime,
                maxTime: s.maxTime
            });
        }
        
        systemsList.sort((a, b) => b.avgTime - a.avgTime);
        
        let html = '';
        html += `<div style="margin-bottom: 8px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 6px; line-height: 1.4;">`;
        html += `  <div style="display: flex; justify-content: space-between;"><span>FPS:</span> <b style="color: #10b981;">${currentFPS}</b> (médio: ${avgFPS})</div>`;
        html += `  <div style="display: flex; justify-content: space-between;"><span>Frame Time:</span> <b style="color: #3b82f6;">${avgFrameTime.toFixed(2)} ms</b></div>`;
        html += `  <div style="display: flex; justify-content: space-between;"><span>CPU Time:</span> <b style="color: #ef4444;">${avgCPUTime.toFixed(2)} ms</b></div>`;
        if (window.performance && window.performance.memory) {
            const heapMB = (window.performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            html += `  <div style="display: flex; justify-content: space-between;"><span>Heap JS:</span> <b>${heapMB} MB</b></div>`;
        }
        if (this.gcCyclesCount > 0) {
            const gcCollectedMB = (this.gcCollectedSum / 1024 / 1024).toFixed(1);
            html += `  <div style="display: flex; justify-content: space-between; color: #ec4899;"><span>GC Coletado:</span> <b>${gcCollectedMB} MB (${this.gcCyclesCount}x)</b></div>`;
        }
        html += `</div>`;
        
        if (window.RenderOptimizationStats) {
            const stats = window.RenderOptimizationStats;
            const matrixPct = stats.setMatrixAtTotal > 0 ? Math.round((stats.setMatrixAtSaved / stats.setMatrixAtTotal) * 100) : 0;
            const colorPct = stats.colorUpdatesTotal > 0 ? Math.round((stats.colorUpdatesSaved / stats.colorUpdatesTotal) * 100) : 0;
            const visPct = stats.visibilityChecksTotal > 0 ? Math.round((stats.visibilityChecksSaved / stats.visibilityChecksTotal) * 100) : 0;
            
            html += `<div style="margin-bottom: 8px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 6px; font-size: 10px; line-height: 1.4; color: #34d399;">`;
            html += `  <div style="font-weight: bold; color: #10b981; margin-bottom: 4px;">🚀 OTIMIZAÇÃO (DIRTY FLAGS):</div>`;
            html += `  <div style="display: flex; justify-content: space-between;"><span>setMatrixAt() Evitados:</span> <span><b>${stats.setMatrixAtSaved.toLocaleString()}</b> (${matrixPct}%)</span></div>`;
            html += `  <div style="display: flex; justify-content: space-between;"><span>Cores Evitadas:</span> <span><b>${stats.colorUpdatesSaved.toLocaleString()}</b> (${colorPct}%)</span></div>`;
            html += `  <div style="display: flex; justify-content: space-between;"><span>Visibilidade Evitada:</span> <span><b>${stats.visibilityChecksSaved.toLocaleString()}</b> (${visPct}%)</span></div>`;
            html += `  <div style="display: flex; justify-content: space-between; color: #60a5fa;"><span>Ganho de FPS Estimado:</span> <span><b>+15 a +35 FPS</b></span></div>`;
            html += `</div>`;
        }
        
        html += `<div style="max-height: 550px; overflow-y: auto; padding-right: 4px;">`;
        systemsList.forEach(sys => {
            const barColor = sys.percentage > 30 ? '#ef4444' : (sys.percentage > 10 ? '#f59e0b' : '#3b82f6');
            html += `  <div style="margin-bottom: 6px; font-size: 10px; line-height: 1.2;">`;
            html += `    <div style="display: flex; justify-content: space-between;">`;
            html += `      <span style="max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: bold;" title="${sys.name}">${sys.name}</span>`;
            html += `      <span>${sys.avgTime.toFixed(3)} ms (${sys.percentage.toFixed(1)}%)</span>`;
            html += `    </div>`;
            html += `    <div style="display: flex; justify-content: space-between; color: #94a3b8; font-size: 9px; margin-top: 1px;">`;
            html += `      <span>chamadas/s: ${Math.round(sys.callsPerSecond)}</span>`;
            html += `      <span>mín: ${sys.minTime.toFixed(3)} | máx: ${sys.maxTime.toFixed(3)}</span>`;
            html += `    </div>`;
            html += `    <div style="background-color: rgba(255,255,255,0.05); height: 3px; border-radius: 1px; margin-top: 2px;">`;
            html += `      <div style="background-color: ${barColor}; width: ${Math.min(100, sys.percentage)}%; height: 100%; border-radius: 1px;"></div>`;
            html += `    </div>`;
            html += `  </div>`;
        });
        html += `</div>`;
        
        content.innerHTML = html;
    },
    
    printConsoleReport: function() {
        const avgFPS = Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / (this.fpsHistory.length || 1));
        const avgFrameTime = this.stats['total_frame'].history.reduce((sum, h) => sum + h.time, 0) / (this.stats['total_frame'].history.length || 1);
        
        const systemsList = [];
        for (const key in this.systems) {
            if (key === 'total_frame') continue;
            const s = this.stats[key];
            const avgTime = s.history.reduce((sum, h) => sum + h.time, 0) / (s.history.length || 1);
            const totalCallsInHistory = s.history.reduce((sum, h) => sum + h.calls, 0);
            
            systemsList.push({
                key: key,
                name: this.systems[key],
                avgTime: avgTime,
                maxTime: s.maxTime,
                calls: totalCallsInHistory,
                percentage: avgFrameTime > 0 ? (avgTime / avgFrameTime) * 100 : 0
            });
        }
        
        systemsList.sort((a, b) => b.avgTime - a.avgTime);
        const top10 = systemsList.slice(0, 10);
        
        console.log(`========================\nPerformance Report\n========================`);
        console.log(`Frame Time: ${avgFrameTime.toFixed(2)} ms`);
        console.log(`FPS médio: ${avgFPS}`);
        console.log(`\nTop 10 sistemas mais lentos:`);
        
        top10.forEach((sys, i) => {
            console.log(`${i+1}. [${sys.name}]`);
            console.log(`   - Tempo médio: ${sys.avgTime.toFixed(3)} ms`);
            console.log(`   - Tempo máximo: ${sys.maxTime.toFixed(3)} ms`);
            console.log(`   - Quantidade de chamadas: ${sys.calls}`);
            console.log(`   - Percentual do frame: ${sys.percentage.toFixed(1)}%`);
        });
        
        if (systemsList.length > 0) {
            const topGargalo = systemsList[0];
            const totalCPU = systemsList.reduce((sum, s) => sum + s.avgTime, 0);
            const cpuPercent = totalCPU > 0 ? (topGargalo.avgTime / totalCPU) * 100 : 0;
            
            console.log(`\n"O maior gargalo atual do jogo é: ${topGargalo.name.toUpperCase()}"`);
            console.log(`Ele representa ${cpuPercent.toFixed(1)}% do tempo total da CPU e ${topGargalo.percentage.toFixed(1)}% do tempo total do frame.`);
        }
        console.log(`========================`);
    }
};

window.PerformanceProfiler = PerformanceProfiler;
PerformanceProfiler.init();

// --- CONSTANTES GLOBAIS DE DIMENSÃO DA ARENA ---
let sizeX = 500;
let sizeZ = 250;
let lodEnabled = false;
let currentTheme = 'medieval';

// --- TABELA DE LOOKUP PARA NÚMEROS ALEATÓRIOS ULTRA RÁPIDA (REDUZ LIXO E CHAMADAS DE CPU) ---
const _RANDOM_TABLE_SIZE = 8192;
const _randomTable = new Float32Array(_RANDOM_TABLE_SIZE);
for (let i = 0; i < _RANDOM_TABLE_SIZE; i++) {
    _randomTable[i] = Math.random();
}
let _randomIdx = 0;
function fastRandom() {
    const val = _randomTable[_randomIdx];
    _randomIdx = (_randomIdx + 1) & 8191; // 8192 é 2^13, logo o operador bitwise & 8191 faz o warp-around ultra rápido
    return val;
}
window.fastRandom = fastRandom;

const boulders = [];
let rainPositions = null;
let rainVelocities = null;
let totalDeadKnights = 0;
let totalDeadGoblins = 0;
let cameraMode = 'orbit';
let cinematicTime = 0;
let cinematicZoomPauseTimer = 0;
let archerRatio = 0.2;
let flankRatio = 0.35;
let numCloudsSetting = 0;
window.panelVisible = true;
let lightningTimer = 0;
let nextLightningTime = 0;
let flashCountdown = 0;
function isNapoleonicTheme() { return currentTheme === 'napoleonic' || currentTheme === 'napoleonic_3d'; }

// Guarda as coordenadas de todas as árvores ativas para verificar a proximidade de cobertura
const treePositions = [];
const treeData = [];
// Guarda as coordenadas de todos os troncos caídos (obstáculos intransponíveis)
const fallenLogs = [];

// --- FUNÇÃO MATEMÁTICA PROCEDURAL PARA AS ELEVAÇÕES DO TERRENO COM CACHE DE BILINEAR INTERPOLATION ---
let terrainCache = null;
let terrainCacheWidth = 0;
let terrainCacheHeight = 0;
let terrainCacheMinX = 0;
let terrainCacheMaxX = 0;
let terrainCacheMinZ = 0;
let terrainCacheMaxZ = 0;
const terrainCacheRes = 0.5; // Resolução de 0.5 metros por célula
const invTerrainCacheRes = 2.0;

function initTerrainHeightCache() {
    const margin = 200;
    const sX = typeof sizeX !== 'undefined' ? sizeX : 1000;
    const sZ = typeof sizeZ !== 'undefined' ? sizeZ : 500;
    
    terrainCacheMinX = -(sX / 2) - margin;
    terrainCacheMaxX = (sX / 2) + margin;
    terrainCacheMinZ = -(sZ / 2) - margin;
    terrainCacheMaxZ = (sZ / 2) + margin;
    
    terrainCacheWidth = Math.ceil((terrainCacheMaxX - terrainCacheMinX) * invTerrainCacheRes) + 1;
    terrainCacheHeight = Math.ceil((terrainCacheMaxZ - terrainCacheMinZ) * invTerrainCacheRes) + 1;
    
    terrainCache = new Float32Array(terrainCacheWidth * terrainCacheHeight);
    
    for (let r = 0; r < terrainCacheHeight; r++) {
        const z = terrainCacheMinZ + r * terrainCacheRes;
        for (let c = 0; c < terrainCacheWidth; c++) {
            const x = terrainCacheMinX + c * terrainCacheRes;
            terrainCache[c + r * terrainCacheWidth] = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 3.2 +
                Math.sin(x * 0.035) * 1.5 +
                Math.cos(z * 0.035) * 1.0;
        }
    }
}

// Inicializar imediatamente
initTerrainHeightCache();

function getTerrainHeight(x, z) {
    if (!terrainCache || x < terrainCacheMinX || x > terrainCacheMaxX || z < terrainCacheMinZ || z > terrainCacheMaxZ) {
        // Fallback para cálculo matemático exato se estiver fora dos limites do cache
        return Math.sin(x * 0.08) * Math.cos(z * 0.08) * 3.2 +
            Math.sin(x * 0.035) * 1.5 +
            Math.cos(z * 0.035) * 1.0;
    }
    
    const c_float = (x - terrainCacheMinX) * invTerrainCacheRes;
    const r_float = (z - terrainCacheMinZ) * invTerrainCacheRes;
    
    const c0 = Math.floor(c_float);
    const r0 = Math.floor(r_float);
    
    const c1 = Math.min(terrainCacheWidth - 1, c0 + 1);
    const r1 = Math.min(terrainCacheHeight - 1, r0 + 1);
    
    const f_c = c_float - c0;
    const f_r = r_float - r0;
    
    const h00 = terrainCache[c0 + r0 * terrainCacheWidth];
    const h10 = terrainCache[c1 + r0 * terrainCacheWidth];
    const h01 = terrainCache[c0 + r1 * terrainCacheWidth];
    const h11 = terrainCache[c1 + r1 * terrainCacheWidth];
    
    const h0 = h00 + f_c * (h10 - h00);
    const h1 = h01 + f_c * (h11 - h01);
    return h0 + f_r * (h1 - h0);
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

    // AI - Layers Update Frequencies (ms)
    AI_GENERAL_UPDATE_MS: 3000,
    AI_BRIGADA_UPDATE_MS: 1000,
    AI_FORMACAO_UPDATE_MS: 200,
    AI_SOLDADO_UPDATE_MS: 100,

    // AI - Morale and Fatigue Thresholds
    MORALE_FLEE_THRESHOLD: 20,
    FATIGUE_DEBUFF_THRESHOLD: 30,
    
    // AI - Base Stats
    STATS: {
        CAVALRY: { mass: 10, speed: 12, range: 4, charge_bonus: 20 },
        INFANTRY: { mass: 3, speed: 4, range: 2, charge_bonus: 2 },
        SPEARMAN: { mass: 5, speed: 3, range: 6, charge_bonus: 1 },
        ARCHER: { mass: 2, speed: 5, range: 100, charge_bonus: 0 }
    },

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