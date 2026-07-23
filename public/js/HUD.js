const HUD = {
    elements: {},

    init() {
        this.elements = {
            countKills: document.getElementById('count-kills'),
            countKnights: document.getElementById('count-knights'),
            countGoblins: document.getElementById('count-goblins'),
            fpsCounter: document.getElementById('fps-counter'),
            fpsCounterTopLeft: document.getElementById('fps-counter-topleft'),
            
            panel: document.getElementById('control-panel'),
            toggleBtn: document.getElementById('floating-toggle-btn'),
            
            btnPause: document.getElementById('btn-pause'),
            pauseIcon: document.getElementById('pause-icon'),
            pauseText: document.getElementById('pause-text'),
            
            btnSound: document.getElementById('btn-sound'),
            
            battleEndModal: document.getElementById('battle-end-modal'),
            winnerTitle: document.getElementById('winner-title'),
            lossKnights: document.getElementById('loss-knights'),
            lossGoblins: document.getElementById('loss-goblins'),
            
            speedVal: document.getElementById('speed-val'),
            cloudsVal: document.getElementById('clouds-val'),
            
            labelKnights: document.getElementById('label-knights'),
            labelGoblins: document.getElementById('label-goblins'),
            btnReinfKnights: document.getElementById('btn-reinf-knights'),
            btnReinfGoblins: document.getElementById('btn-reinf-goblins'),
            
            tabletZoomControls: document.getElementById('tablet-zoom-controls'),
            
            toggleLogs: document.getElementById('toggle-logs'),
            unitsSlider: document.getElementById('units-slider'),
            flankSelect: document.getElementById('flank-ratio-select'),
            cloudsSlider: document.getElementById('clouds-slider'),
            archerSlider: document.getElementById('archer-ratio-slider'),
            arenaSlider: document.getElementById('arena-slider'),
            speedSlider: document.getElementById('speed-slider'),
            
            loader: document.getElementById('loader'),
            loaderText: document.getElementById('loader-text')
        };
    },

    updateKills(kills) {
        if (this.elements.countKills) this.elements.countKills.innerText = kills;
    },

    updateArmy(faction, count) {
        const el = faction === 'knights' ? this.elements.countKnights : this.elements.countGoblins;
        if (el) {
            el.innerText = count;
        }
    },

    updateArmyCounts(knightsCount, goblinsCount) {
        this.updateArmy('knights', knightsCount);
        this.updateArmy('goblins', goblinsCount);
    },

    updateAIStatus(faction, genState, brigState, formState) {
        const elGen = document.getElementById(`ai-gen-${faction}`);
        const elBrig = document.getElementById(`ai-brig-${faction}`);
        const elForm = document.getElementById(`ai-form-${faction}`);
        if (elGen) elGen.innerText = genState;
        if (elBrig) elBrig.innerText = brigState;
        if (elForm) elForm.innerText = formState;
    },

    updatePause(isPaused) {
        if (!this.elements.btnPause) return;
        if (isPaused) {
            this.elements.btnPause.className = "py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-xs font-black rounded-lg transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95";
            if (this.elements.pauseIcon) this.elements.pauseIcon.innerText = "▶️";
            if (this.elements.pauseText) this.elements.pauseText.innerText = "Continuar";
        } else {
            this.elements.btnPause.className = "py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-xs font-black rounded-lg transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95";
            if (this.elements.pauseIcon) this.elements.pauseIcon.innerText = "⏸️";
            if (this.elements.pauseText) this.elements.pauseText.innerText = "Pausar";
        }
    },

    updateAudioBtn(soundEnabled) {
        if (!this.elements.btnSound) return;
        if (soundEnabled) {
            this.elements.btnSound.className = "w-full py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 transition-all flex items-center justify-center gap-2";
            this.elements.btnSound.innerHTML = `<span id="sound-icon">🔊</span> Som Ativado`;
        } else {
            this.elements.btnSound.className = "w-full py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all flex items-center justify-center gap-2";
            this.elements.btnSound.innerHTML = `<span id="sound-icon">🔇</span> Som Desativado`;
        }
    },

    updateWeather(type) {
        document.querySelectorAll('.env-btn').forEach(b => b.className = "env-btn px-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all flex flex-col items-center gap-0.5");
        const activeBtn = document.getElementById(`btn-env-${type}`);
        if (activeBtn) {
            activeBtn.className = "env-btn px-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all flex flex-col items-center gap-0.5";
        }
    },

    updateTheme(theme, nameKnights, nameGoblins) {
        document.querySelectorAll('.theme-btn').forEach(b => {
            b.className = "theme-btn py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all flex flex-col items-center gap-0.5";
        });
        const activeBtn = document.getElementById(`btn-theme-${theme}`);
        if (activeBtn) {
            activeBtn.className = "theme-btn py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex flex-col items-center gap-0.5";
        }
        
        if (this.elements.labelKnights) this.elements.labelKnights.innerText = nameKnights;
        if (this.elements.labelGoblins) this.elements.labelGoblins.innerText = nameGoblins;
        if (this.elements.btnReinfKnights) this.elements.btnReinfKnights.innerHTML = `➕ 50 ${nameKnights}`;
        if (this.elements.btnReinfGoblins) this.elements.btnReinfGoblins.innerHTML = `➕ 50 ${nameGoblins}`;
    },
    
    updateCameraBtn(mode) {
        document.querySelectorAll('.cam-btn').forEach(b => b.className = "cam-btn py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all");
        const activeBtn = document.getElementById(`btn-cam-${mode}`);
        if (activeBtn) {
            activeBtn.className = "cam-btn py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all";
        }
        if (mode === 'rts' || mode === 'isometric') {
            if (this.elements.tabletZoomControls) this.elements.tabletZoomControls.style.display = 'flex';
        } else {
            if (this.elements.tabletZoomControls) this.elements.tabletZoomControls.style.display = 'none';
        }
    },
    
    updateSettingsVisibility(isVisible) {
        if (!this.elements.panel) return;
        if (isVisible) {
            this.elements.panel.style.transform = 'translateY(0) scale(1)';
            this.elements.panel.style.opacity = '1';
            this.elements.panel.style.pointerEvents = 'auto';
            if (this.elements.toggleBtn) this.elements.toggleBtn.innerHTML = '🙈 Ocultar Controles';
        } else {
            this.elements.panel.style.transform = 'translateY(50px) scale(0.9)';
            this.elements.panel.style.opacity = '0';
            this.elements.panel.style.pointerEvents = 'none';
            if (this.elements.toggleBtn) this.elements.toggleBtn.innerHTML = '🛠️ Ajustes';
        }

        window.panelVisible = isVisible;
        const perfPanel = document.getElementById('perf-debug-panel');
        if (perfPanel) {
            perfPanel.style.display = isVisible ? 'block' : 'none';
        }
    },
    
    updateSliderValue(sliderId, valStr) {
        const el = document.getElementById(`${sliderId}-val`);
        if (el) el.innerText = valStr;
    },
    
    showBattleEndModal(winnerFaction, deadKnights, deadGoblins, nameKnights, nameGoblins) {
        if (this.elements.winnerTitle) {
            if (winnerFaction === 'knights') {
                this.elements.winnerTitle.innerText = `Vitória: ${nameKnights}!`;
                this.elements.winnerTitle.className = "text-2xl font-black text-blue-500 mb-2 tracking-wide uppercase text-center";
            } else if (winnerFaction === 'goblins') {
                this.elements.winnerTitle.innerText = `Vitória: ${nameGoblins}!`;
                this.elements.winnerTitle.className = "text-2xl font-black text-red-500 mb-2 tracking-wide uppercase text-center";
            } else {
                this.elements.winnerTitle.innerText = "Empate!";
                this.elements.winnerTitle.className = "text-2xl font-black text-amber-500 mb-2 tracking-wide uppercase text-center";
            }
        }
        if (this.elements.lossKnights) this.elements.lossKnights.innerText = deadKnights;
        if (this.elements.lossGoblins) this.elements.lossGoblins.innerText = deadGoblins;
        if (this.elements.battleEndModal) this.elements.battleEndModal.classList.remove('hidden');
    },
    
    hideBattleEndModal() {
        if (this.elements.battleEndModal) this.elements.battleEndModal.classList.add('hidden');
    },
    
    updateFPS(fps) {
        if (this.elements.fpsCounter) this.elements.fpsCounter.innerText = `${fps} FPS`;
        if (this.elements.fpsCounterTopLeft) this.elements.fpsCounterTopLeft.innerText = `FPS: ${fps}`;
    },
    
    showLoaderError(msg) {
        if (this.elements.loaderText) {
            this.elements.loaderText.innerHTML = `Erro ao iniciar: ${msg}<br><span class='text-xs text-slate-400'>Por favor, recarregue a página.</span>`;
        }
    },
    
    hideLoader() {
        if (this.elements.loader) this.elements.loader.style.opacity = '0';
        setTimeout(() => {
            if (this.elements.loader) this.elements.loader.style.display = 'none';
        }, 500);
    },
    
    isToggleLogsChecked() {
        return this.elements.toggleLogs ? this.elements.toggleLogs.checked : false;
    },
    
    getUnitsSliderValue() {
        return this.elements.unitsSlider ? parseInt(this.elements.unitsSlider.value) : 0;
    },
    
    setCloudsSliderValue(val) {
        if (this.elements.cloudsSlider) this.elements.cloudsSlider.value = val;
    },
    
    setupListeners(callbacks) {
        if (this.elements.unitsSlider) {
            this.elements.unitsSlider.addEventListener('input', (e) => callbacks.onUnitsChange(e.target.value));
        }
        if (this.elements.flankSelect) {
            this.elements.flankSelect.addEventListener('change', (e) => callbacks.onFlankChange(e.target.value));
        }
        if (this.elements.cloudsSlider) {
            this.elements.cloudsSlider.addEventListener('input', (e) => callbacks.onCloudsChange(e.target.value));
        }
        if (this.elements.archerSlider) {
            this.elements.archerSlider.addEventListener('input', (e) => callbacks.onArcherChange(e.target.value));
        }
        if (this.elements.arenaSlider) {
            this.elements.arenaSlider.addEventListener('input', (e) => callbacks.onArenaInput(e.target.value));
            this.elements.arenaSlider.addEventListener('change', (e) => callbacks.onArenaChange(e.target.value));
        }
        if (this.elements.speedSlider) {
            this.elements.speedSlider.addEventListener('input', (e) => callbacks.onSpeedChange(e.target.value));
        }
    }
};

window.HUD = HUD;

// Automatically profile all HUD methods under "hud"
for (const key in HUD) {
    if (typeof HUD[key] === 'function') {
        const original = HUD[key];
        HUD[key] = function(...args) {
            if (window.PerformanceProfiler) window.PerformanceProfiler.start('hud');
            const res = original.apply(this, args);
            if (window.PerformanceProfiler) window.PerformanceProfiler.end('hud');
            return res;
        };
    }
}