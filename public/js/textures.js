// --- 4. GERAÇÃO DE TEXTURAS COMPATÍVEIS (HTML CANVAS) ---
function generateProceduralTexture(faction, role) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const isArcher = (role === 'archer');

    if (faction === 'knights') {
        ctx.fillStyle = '#4c566a';
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#2e3440';
        ctx.lineWidth = 1;
        for (let i = 0; i < 64; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i, 0); ctx.lineTo(i, 64);
            ctx.moveTo(0, i); ctx.lineTo(64, i);
            ctx.stroke();
        }
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(5, 7, 54, 50);

        if (isArcher) {
            ctx.strokeStyle = '#5c3d2e';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(5, 7);
            ctx.lineTo(59, 57);
            ctx.stroke();
        }
    } else {
        ctx.fillStyle = '#5c7a43';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#4d6934';
        for (let i = 0; i < 15; i++) {
            ctx.fillRect(Math.random() * 50, Math.random() * 50, 6, 6);
        }
        ctx.fillStyle = '#5c3d2e';
        ctx.fillRect(7, 10, 50, 44);

        if (isArcher) {
            ctx.strokeStyle = '#211510';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(7, 7);
            ctx.lineTo(57, 57);
            ctx.stroke();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

function generateShieldTexture(faction) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (isNapoleonicTheme()) {
        if (faction === 'knights') {
            // Bandeira da França (Azul, Branco, Vermelho)
            ctx.fillStyle = '#0055A5';
            ctx.fillRect(0, 0, 21, 64);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(21, 0, 22, 64);
            ctx.fillStyle = '#EF4135';
            ctx.fillRect(43, 0, 21, 64);
        } else {
            // Bandeira Britânica (Union Jack simplificada)
            ctx.fillStyle = '#00247D';
            ctx.fillRect(0, 0, 64, 64);

            // Diagonais brancas
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(64, 64);
            ctx.moveTo(64, 0); ctx.lineTo(0, 64);
            ctx.stroke();

            // Diagonais vermelhas
            ctx.strokeStyle = '#CF142B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(64, 64);
            ctx.moveTo(64, 0); ctx.lineTo(0, 64);
            ctx.stroke();

            // Cruz branca
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(24, 0, 16, 64);
            ctx.fillRect(0, 24, 64, 16);

            // Cruz vermelha
            ctx.fillStyle = '#CF142B';
            ctx.fillRect(28, 0, 8, 64);
            ctx.fillRect(0, 28, 64, 8);
        }
    } else {
        if (faction === 'knights') {
            ctx.fillStyle = '#1b2a4a';
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(28, 5, 8, 54);
            ctx.fillRect(5, 28, 54, 8);
        } else {
            ctx.fillStyle = '#6e3e15';
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = '#4a2507';
            ctx.fillRect(0, 12, 64, 5);
            ctx.fillRect(0, 30, 64, 6);
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 5;
            ctx.strokeRect(8, 8, 48, 48);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// --- Helper para fundir geometrias ---
function mergeBufferGeometries(geo1, geo2) {
    const position1 = geo1.attributes.position.array;
    const position2 = geo2.attributes.position.array;
    const normal1 = geo1.attributes.normal.array;
    const normal2 = geo2.attributes.normal.array;

    const combinedPositions = new Float32Array(position1.length + position2.length);
    combinedPositions.set(position1);
    combinedPositions.set(position2, position1.length);

    const combinedNormals = new Float32Array(normal1.length + normal2.length);
    combinedNormals.set(normal1);
    combinedNormals.set(normal2, normal1.length);

    const index1 = geo1.index ? geo1.index.array : null;
    const index2 = geo2.index ? geo2.index.array : null;

    const mergedGeo = new THREE.BufferGeometry();
    mergedGeo.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));
    mergedGeo.setAttribute('normal', new THREE.BufferAttribute(combinedNormals, 3));

    if (index1 && index2) {
        const combinedIndices = new Uint16Array(index1.length + index2.length);
        combinedIndices.set(index1);
        const offset = position1.length / 3;
        for (let i = 0; i < index2.length; i++) {
            combinedIndices[index1.length + i] = index2[i] + offset;
        }
        mergedGeo.setIndex(new THREE.BufferAttribute(combinedIndices, 1));
    }
    return mergedGeo;
}
