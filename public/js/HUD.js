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
            loaderText: document.getElementById('loader-text'),
            
            // Novos elementos do Painel Inferior
            blueGroupsContainer: document.getElementById('blue-groups-container'),
            redGroupsContainer: document.getElementById('red-groups-container'),
            btnStartBattle: document.getElementById('btn-start-battle'),
            orderContextMenu: document.getElementById('order-context-menu')
        };
        
        // Esconde menu de contexto se clicar fora
        document.addEventListener('click', (e) => {
            if (HUD.elements.orderContextMenu && !HUD.elements.orderContextMenu.contains(e.target) && !e.target.closest('.group-card-blue')) {
                HUD.elements.orderContextMenu.classList.add('hidden');
                document.querySelectorAll('.indicator-select').forEach(el => el.classList.add('hidden'));
                document.querySelectorAll('.group-card-blue').forEach(el => el.classList.remove('ring-2', 'ring-amber-500'));
                window.selectedBrigadeId = null;
            }
        });
    },

    updateKills(kills) {
        if (this.elements.countKills) this.elements.countKills.innerText = kills;
    },

    updateArmy(faction, count) {
        const el = faction === 'knights' ? this.elements.countKnights : this.elements.countGoblins;
        if (el) {
            let text = String(count);
            if (typeof CONFIG !== 'undefined' && CONFIG.STRENGTH_SYSTEM_ENABLED && window.armies && window.armies[faction]) {
                text = `${count} (A${window.armies[faction].attackStrength}/D${window.armies[faction].defenseStrength})`;
            }
            el.innerText = text;
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
    },
    
    // --- Lógica do Painel Inferior (Cartas de Grupos) ---
    renderGroups(faction, brigades) {
        const container = faction === 'knights' ? this.elements.blueGroupsContainer : this.elements.redGroupsContainer;
        if (!container) return;
        
        container.innerHTML = ''; // Limpa antigos
        
        const isPlayer = faction === 'knights';
        const bgClass = isPlayer ? 'bg-blue-900/40 border-blue-500/50 hover:bg-blue-800/60' : 'bg-red-900/40 border-red-500/50';
        const textClass = isPlayer ? 'text-blue-300' : 'text-red-300';
        const interactiveClass = isPlayer ? 'cursor-pointer group-card-blue' : 'cursor-default opacity-80';
        
        const orderWeight = { 'MELEE': 1, 'ARCHER': 2, 'CATAPULT': 3 };
        const sortedBrigades = [...brigades].sort((a, b) => (orderWeight[a.type] || 0) - (orderWeight[b.type] || 0));
        
        sortedBrigades.forEach((brigade, index) => {
            const count = brigade.formations.reduce((sum, f) => sum + f.soldiers.length, 0);
            
            // Define a borda baseada na ordem atual (para indicar Aguardar sem usar um ícone extra)
            let currentBorder = isPlayer ? (brigade.order === 'WAIT' ? 'border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'border-blue-500/50') : 'border-red-500/50';
            
            const card = document.createElement('div');
            card.className = `w-10 h-14 rounded-xl border ${bgClass} ${currentBorder} ${interactiveClass} flex flex-col items-center justify-center relative transition-all shadow-sm active:scale-95 shrink-0`;
            card.dataset.brigadeId = brigade.id;
            
            // Ícone do tipo de tropa
            let typeIcon = '⚔️';
            if (brigade.type === 'ARCHER') typeIcon = '🏹';
            else if (brigade.type === 'CATAPULT') typeIcon = '🪨';
            
            card.innerHTML = `
                <div class="text-xl leading-none mb-1 mt-1">${typeIcon}</div>
                <div class="${textClass} text-[10px] font-black leading-none">${count}</div>
                ${isPlayer ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border border-slate-900 hidden indicator-select"></div>' : ''}
            `;
            
            if (isPlayer) {
                card.onclick = (e) => {
                    this.showOrderContextMenu(e, brigade.id, card);
                };
            }
            
            container.appendChild(card);
        });
    },
    
    showOrderContextMenu(event, brigadeId, cardElement) {
        const menu = this.elements.orderContextMenu;
        if (!menu) return;
        
        // Remove destaque de todos
        document.querySelectorAll('.indicator-select').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.group-card-blue').forEach(el => el.classList.remove('ring-2', 'ring-amber-500'));
        
        // Destaca o atual
        cardElement.classList.add('ring-2', 'ring-amber-500');
        const indicator = cardElement.querySelector('.indicator-select');
        if (indicator) indicator.classList.remove('hidden');
        
        // Posiciona menu
        const rect = cardElement.getBoundingClientRect();
        // Centraliza em relação ao card (o menu tem w-40 = 160px)
        menu.style.left = `${rect.left + (rect.width / 2) - 80}px`;
        menu.style.top = 'auto'; 
        menu.style.bottom = `${window.innerHeight - rect.top + 5}px`; // 5px acima do card
        menu.classList.remove('hidden');
        
        window.selectedBrigadeId = brigadeId; // Salva globalmente para setBrigadeOrder
    },
    
    selectBrigadeCard(brigadeId, clientX, clientY) {
        const card = document.querySelector(`div[data-brigade-id="${brigadeId}"]`);
        if (card) {
            const rect = card.getBoundingClientRect();
            const event = {
                clientX: clientX !== undefined ? clientX : (rect.left + rect.width / 2),
                clientY: clientY !== undefined ? clientY : (rect.top - 10)
            };
            this.showOrderContextMenu(event, brigadeId, card);
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    },
    
    updateBrigadeCardIcon(brigadeId, order) {
        const card = document.querySelector(`div[data-brigade-id="${brigadeId}"]`);
        if (card) {
            card.classList.remove('border-blue-500/50', 'border-amber-400/80', 'border-purple-400/80', 'border-red-400/80', 'border-emerald-400/80', 'shadow-[0_0_8px_rgba(251,191,36,0.4)]', 'shadow-[0_0_8px_rgba(192,132,252,0.4)]', 'shadow-[0_0_8px_rgba(52,211,153,0.4)]');
            
            if (order === 'WAIT' || order === 'DEFEND') {
                card.classList.add('border-amber-400/80', 'shadow-[0_0_8px_rgba(251,191,36,0.4)]');
            } else if (order === 'FLANK_LEFT' || order === 'FLANK_RIGHT') {
                card.classList.add('border-purple-400/80', 'shadow-[0_0_8px_rgba(192,132,252,0.4)]');
            } else if (order === 'RETREAT') {
                card.classList.add('border-red-400/80');
            } else if (order === 'MOVE_TO') {
                card.classList.add('border-emerald-400/80', 'shadow-[0_0_8px_rgba(52,211,153,0.4)]');
            } else {
                card.classList.add('border-blue-500/50');
            }
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