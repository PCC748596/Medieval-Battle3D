// --- CONTROLO TÁTIL E ARRASTAMENTO INTEGRADO NATIVO ---
const controls = {
    target: new THREE.Vector3(0, 0, 0),
    enabled: true,
    update: function () { }
};

let theta = 0.5; // Ângulo horizontal
let phi = 1.0;   // Ângulo vertical
let radius = 60; // Distância da câmara

function updateCameraAngles() {
    if (!window.camera || !controls || !controls.target) return;
    phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi));
    camera.position.x = controls.target.x + radius * Math.sin(theta) * Math.sin(phi);
    camera.position.y = controls.target.y + radius * Math.cos(phi);
    camera.position.z = controls.target.z + radius * Math.cos(theta) * Math.sin(phi);
    camera.lookAt(controls.target);
}

// Função de zoom dedicada
window.zoomCamera = function (amount) {
    const maxRadius = Math.max(sizeX, sizeZ) * 0.65;
    radius = Math.max(15, Math.min(maxRadius, radius + amount));
    if (typeof cameraMode !== 'undefined' && cameraMode === 'cinematic') {
        cinematicZoomPauseTimer = 3.0;
    } else {
        updateCameraAngles();
    }
};

// Gestão de Toques e Rato simultâneos (iPad Safari)
let isPointerDown = false;
let prevPointerX = 0;
let prevPointerY = 0;
let activeDragButton = -1;
let totalDragDist = 0;

function onPointerStart(x, y, button = 0) {
    isPointerDown = true;
    activeDragButton = button;
    prevPointerX = x;
    prevPointerY = y;
    totalDragDist = 0;
    isDraggingPath = false;
    
    if (button === 0) {
        draggingBrigadeId = getClickedBrigadeId(x, y);
    }
}

const _controlsForwardCache = new THREE.Vector3();
const _controlsRightCache = new THREE.Vector3();

function onPointerMove(x, y) {
    if (!isPointerDown || !controls || !controls.enabled || !window.camera) return;
    const dx = x - prevPointerX;
    const dy = y - prevPointerY;

    if (activeDragButton === 2) {
        // Mover a câmara (pan) usando o botão direito
        const forward = _controlsForwardCache;
        forward.set(controls.target.x - camera.position.x, 0, controls.target.z - camera.position.z).normalize();
        const right = _controlsRightCache.set(-forward.z, 0, forward.x);

        const panSensitivity = radius * 0.0015;

        controls.target.addScaledVector(right, -dx * panSensitivity);
        controls.target.addScaledVector(forward, dy * panSensitivity);

        const maxLimitX = sizeX / 2 + 20;
        const maxLimitZ = sizeZ / 2 + 20;
        controls.target.x = Math.max(-maxLimitX, Math.min(maxLimitX, controls.target.x));
        controls.target.z = Math.max(-maxLimitZ, Math.min(maxLimitZ, controls.target.z));

        updateCameraAngles();
    } else if (activeDragButton === 1) {
        // Rotacionar a câmara (botão central)
        theta -= dx * 0.007;
        phi -= dy * 0.007;
        updateCameraAngles();
    } else if (activeDragButton === 0 && draggingBrigadeId) {
        if (totalDragDist > 8) {
            isDraggingPath = true;
            updatePathDrawing(x, y);
        }
    }

    totalDragDist += Math.hypot(dx, dy);
    prevPointerX = x;
    prevPointerY = y;
}

const _clickRaycaster = new THREE.Raycaster();
const _clickPointer = new THREE.Vector2();
const _tmpClickPos = new THREE.Vector3();

function getClickedBrigadeId(clientX, clientY) {
    if (typeof camera === 'undefined' || typeof battleManager === 'undefined') return null;

    _clickPointer.x = (clientX / window.innerWidth) * 2 - 1;
    _clickPointer.y = -(clientY / window.innerHeight) * 2 + 1;
    _clickRaycaster.setFromCamera(_clickPointer, camera);

    const knights = battleManager.getKnights();
    let closestWarrior = null;
    let closestDist = Infinity;

    for (let i = 0; i < knights.length; i++) {
        const w = knights[i];
        if (w.isDead) continue;

        _tmpClickPos.set(w.x, w.y, w.z);
        const distToRay = _clickRaycaster.ray.distanceToPoint(_tmpClickPos);

        if (distToRay <= (w.radius || 1.1) * 2.2) {
            const distAlongRay = _clickRaycaster.ray.origin.distanceToSquared(_tmpClickPos);
            if (distAlongRay < closestDist) {
                closestDist = distAlongRay;
                closestWarrior = w;
            }
        }
    }

    if (!closestWarrior && battleManager.getCatapults) {
        const catapults = battleManager.getCatapults();
        let closestCat = null;
        for (let i = 0; i < catapults.length; i++) {
            const c = catapults[i];
            if (c.faction !== 'knights' || c.isDead) continue;
            _tmpClickPos.set(c.x, (c.terrainY !== undefined ? c.terrainY + 1.5 : 1.5), c.z);
            const distToRay = _clickRaycaster.ray.distanceToPoint(_tmpClickPos);
            if (distToRay <= (c.radius || 2.5) * 2.2) {
                const distAlongRay = _clickRaycaster.ray.origin.distanceToSquared(_tmpClickPos);
                if (distAlongRay < closestDist) {
                    closestDist = distAlongRay;
                    closestCat = c;
                }
            }
        }
        if (closestCat && closestCat.brigada) {
            return closestCat.brigada.id;
        }
    }

    if (closestWarrior) {
        const general = window.AICommanderSystem ? window.AICommanderSystem.knightGeneral : null;
        if (general) {
            for (const b of general.brigades) {
                if (b.formations) {
                    for (const f of b.formations) {
                        if (f.soldiers.includes(closestWarrior)) {
                            return b.id;
                        }
                    }
                }
            }
        }
    }
    return null;
}

function handleSceneClick(clientX, clientY) {
    const id = getClickedBrigadeId(clientX, clientY);
    if (id && window.HUD && window.HUD.selectBrigadeCard) {
        window.HUD.selectBrigadeCard(id, clientX, clientY);
    }
}

let pathLineMesh = null;
let pathLineCone = null;
let pathArrowGroup = null;
let draggingBrigadeId = null;
let lastDragTarget = new THREE.Vector3();
let isDraggingPath = false;

function updatePathDrawing(clientX, clientY) {
    if (!draggingBrigadeId) return;
    
    _clickPointer.x = (clientX / window.innerWidth) * 2 - 1;
    _clickPointer.y = -(clientY / window.innerHeight) * 2 + 1;
    _clickRaycaster.setFromCamera(_clickPointer, camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    const intersect = _clickRaycaster.ray.intersectPlane(plane, target);
    
    if (intersect) {
        let b = window.AICommanderSystem ? window.AICommanderSystem.knightGeneral.brigades.find(br => br.id === draggingBrigadeId) : null;
        if (!b && window.AICommanderSystem) {
            b = window.AICommanderSystem.goblinGeneral.brigades.find(br => br.id === draggingBrigadeId);
        }
        if (b) {
            const origin = window.getBrigadeCenter ? window.getBrigadeCenter(b) : new THREE.Vector3();
            if (window.updateTacticalArrow) {
                window.updateTacticalArrow(origin, target, 0x34d399);
            }
            window.isDraggingPath = true;
            isDraggingPath = true;
            lastDragTarget.copy(target);
        }
    }
}

function onPointerEnd(clientX, clientY) {
    if (isPointerDown && activeDragButton === 0) {
        if (isDraggingPath && draggingBrigadeId) {
            if (window.setBrigadeMoveTo) {
                window.setBrigadeMoveTo(draggingBrigadeId, lastDragTarget.x, lastDragTarget.z);
            }
        } else if (totalDragDist < 8 && clientX !== undefined && clientY !== undefined) {
            handleSceneClick(clientX, clientY);
        }
    } else if (isPointerDown && totalDragDist < 8 && clientX !== undefined && clientY !== undefined) {
        handleSceneClick(clientX, clientY);
    }
    isPointerDown = false;
    activeDragButton = -1;
    isDraggingPath = false;
    window.isDraggingPath = false;
    draggingBrigadeId = null;
}

// Desativa o menu de contexto no painel de visualização para permitir arrastamento com botão direito
window.addEventListener('contextmenu', (e) => {
    if (e.clientY > 80 && e.clientX > 340) {
        e.preventDefault();
    }
});

// Listeners Rato (PC/Desktop)
window.addEventListener('mousedown', function (e) {
    if (e.target.closest && e.target.closest('#control-panel, #hud-bottom-panel, #order-context-menu, button, input, select')) return;
    if (e.button === 0 || e.button === 1 || e.button === 2) {
        onPointerStart(e.clientX, e.clientY, e.button);
    }
});
window.addEventListener('mousemove', function (e) { onPointerMove(e.clientX, e.clientY); });
window.addEventListener('mouseup', function(e) { onPointerEnd(e.clientX, e.clientY); });

let initialPinchDistance = null;

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Listeners Toques Táteis (Safari Tablet/iPad)
window.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch.clientY > 80 && touch.clientX > 340) {
            onPointerStart(touch.clientX, touch.clientY);
        }
    } else if (e.touches.length === 2) {
        initialPinchDistance = getPinchDistance(e.touches);
    }
}, { passive: false });

window.addEventListener('touchmove', function (e) {
    if (e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
        const currentDistance = getPinchDistance(e.touches);
        if (initialPinchDistance !== null) {
            const delta = initialPinchDistance - currentDistance;
            zoomCamera(delta * 0.3);
            initialPinchDistance = currentDistance;
        }
    }
}, { passive: false });

window.addEventListener('touchend', function(e) {
    if (e.touches.length < 2) {
        initialPinchDistance = null;
    }
    if (e.touches.length === 0) {
        const touch = e.changedTouches ? e.changedTouches[0] : null;
        onPointerEnd(touch ? touch.clientX : undefined, touch ? touch.clientY : undefined);
    }
});

// Zoom com roda do rato
window.addEventListener('wheel', function (e) {
    const controlPanel = document.getElementById('control-panel');
    if (controlPanel && controlPanel.contains(e.target)) return;

    if (!controls.enabled && cameraMode !== 'cinematic') return;
    zoomCamera(e.deltaY * 0.05);
}, { passive: true });

const cannonCarriageGeo = new THREE.BoxGeometry(2.3, 1.2, 4.8);
const cannonRimGeo = new THREE.TorusGeometry(1.68, 0.24, 8, 24);
const cannonHubGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.48, 12);
const cannonSpokeGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.36, 8);
const cannonAxleGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.84, 6);
const cannonBarrelGeo = new THREE.CylinderGeometry(0.36, 0.54, 5.4, 12);
const cannonBackGeo = new THREE.SphereGeometry(0.54, 8, 8);

const cataBaseGeo = new THREE.BoxGeometry(6.4, 1.0, 4.0);
const cataWheelGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.56, 8);
const cataAxleGeo1 = new THREE.CylinderGeometry(0.2, 0.2, 4.0, 6);
const cataAxleGeo2 = new THREE.CylinderGeometry(0.2, 0.2, 4.0, 6);
const cataSupportGeo = new THREE.BoxGeometry(0.44, 4.4, 0.44);
const cataCrossGeo = new THREE.BoxGeometry(3.2, 0.4, 0.4);
const cataArmLongGeo = new THREE.BoxGeometry(0.36, 6.4, 0.36);
const cataCounterGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
const cataBucketGeo = new THREE.SphereGeometry(0.5, 6, 4);
