// --- 5. MONTAGEM DA ARENA COM ELEVAÇÕES ---
const grassTexture = generateProceduralTexture('knights', 'melee'); // Textura de preenchimento básica caso falhe
const wallMat = new THREE.MeshLambertMaterial({ color: 0x5d6167 });

// Gera relva processada
const groundCanvas = document.createElement('canvas');
groundCanvas.width = 128;
groundCanvas.height = 128;
const gCtx = groundCanvas.getContext('2d');
gCtx.fillStyle = '#4c8c35';
gCtx.fillRect(0, 0, 128, 128);
for (let i = 0; i < 500; i++) {
    gCtx.fillStyle = Math.random() > 0.5 ? '#3b7027' : '#5db341';
    gCtx.fillRect(Math.random() * 128, Math.random() * 128, 3, 3);
}
const grassTextureReal = new THREE.CanvasTexture(groundCanvas);
grassTextureReal.wrapS = THREE.RepeatWrapping;
grassTextureReal.wrapT = THREE.RepeatWrapping;
grassTextureReal.repeat.set(12, 12);

const groundMat = new THREE.MeshLambertMaterial({ map: grassTextureReal, vertexColors: true });
let frameCount = 0;
const lakes = [];
const muds = [];
const clouds = [];
let cloudInstancedMesh;
let rainMesh;
let isRaining = false;
let ground;
const arenaWalls = [];
const treeMeshes = [];

// Muralhas
const buildArenaWall = (w, h, d, x, y, z, rotY) => {
    const box = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(box, wallMat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY || 0;
    scene.add(mesh);
    arenaWalls.push(mesh);
};

let treeTrunkInstanced, treeLeaves1Instanced, treeLeaves2Instanced, treeLeaves3Instanced;
function clearArena() {
    arenaWalls.forEach(wall => {
        scene.remove(wall);
        wall.geometry.dispose();
    });
    arenaWalls.length = 0;

    if (treeTrunkInstanced) { scene.remove(treeTrunkInstanced); treeTrunkInstanced.dispose(); treeTrunkInstanced = null; }
    if (treeLeaves1Instanced) { scene.remove(treeLeaves1Instanced); treeLeaves1Instanced.dispose(); treeLeaves1Instanced = null; }
    if (treeLeaves2Instanced) { scene.remove(treeLeaves2Instanced); treeLeaves2Instanced.dispose(); treeLeaves2Instanced = null; }
    if (treeLeaves3Instanced) { scene.remove(treeLeaves3Instanced); treeLeaves3Instanced.dispose(); treeLeaves3Instanced = null; }

    treeMeshes.length = 0;
    treePositions.length = 0;
    treeData.length = 0;

    if (ground) {
        scene.remove(ground);
        ground.geometry.dispose();
    }
}

function buildArena() {
    const groundGeo = new THREE.PlaneGeometry(1000, 1000, 128, 128);
    const posAttr = groundGeo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);

    // Geração de lagos (mais lagos, menores, nas partes baixas)
    lakes.length = 0;
    const numLakes = 0; // 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numLakes; i++) {
        let lx, lz, attempts = 0;
        do {
            lx = (Math.random() - 0.5) * 800;
            lz = (Math.random() - 0.5) * 400;
            attempts++;
        } while (getTerrainHeight(lx, lz) > -0.5 && attempts < 50);

        lakes.push({
            x: lx,
            z: lz,
            r: 8 + Math.random() * 7
        });
    }

    // Geração de lama (mais lamas, menores)
    muds.length = 0;
    const numMuds = 0; // 10 + Math.floor(Math.random() * 9);
    for (let i = 0; i < numMuds; i++) {
        muds.push({
            x: (Math.random() - 0.5) * 800,
            z: (Math.random() - 0.5) * 400,
            r: 10 + Math.random() * 10
        });
    }

    for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const height = getTerrainHeight(vx, -vy);
        posAttr.setZ(i, height);

        // A cor base da relva é branca (a textura cuida do verde)
        let r = 1.0, g = 1.0, b = 1.0;

        // Verifica se está dentro de lama
        for (let j = 0; j < muds.length; j++) {
            const dx = vx - muds[j].x;
            const dz = -vy - muds[j].z;
            if (dx * dx + dz * dz < muds[j].r * muds[j].r) {
                // Castanho escuro para lama
                r = 0.4; g = 0.25; b = 0.1;
                break;
            }
        }

        // Verifica se está dentro de lago (sobrepõe lama)
        for (let j = 0; j < lakes.length; j++) {
            const dx = vx - lakes[j].x;
            const dz = -vy - lakes[j].z;
            if (dx * dx + dz * dz < lakes[j].r * lakes[j].r) {
                // Azul para lago
                r = 0.2; g = 0.4; b = 0.8;
                break;
            }
        }

        colorAttr[i * 3] = r;
        colorAttr[i * 3 + 1] = g;
        colorAttr[i * 3 + 2] = b;
    }

    groundGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    groundGeo.computeVertexNormals();

    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    buildStoneWallPerimeter();
}

// --- GERADOR DE MURALHA DE PEDRA (BORDAS DO MAPA) ---
function buildStoneWallPerimeter() {
    // O terreno visual tem 1000x1000
    const halfX = 1000 / 2;
    const halfZ = 1000 / 2;
    const wallGeo = new THREE.DodecahedronGeometry(1, 0); 
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x7c8185, flatShading: true, roughness: 0.9, metalness: 0.1 });
    
    const positions = [];
    const step = 30; // Distância maior para o fim do mapa
    
    for (let x = -halfX; x <= halfX; x += step) {
        positions.push({ x: x, z: -halfZ });
        positions.push({ x: x, z: halfZ });
    }
    for (let z = -halfZ; z <= halfZ; z += step) {
        positions.push({ x: -halfX, z: z });
        positions.push({ x: halfX, z: z });
    }
    
    const instancedWall = new THREE.InstancedMesh(wallGeo, wallMat, positions.length * 3);
    let idx = 0;
    const dummy = new THREE.Object3D();
    
    for (const pos of positions) {
        const numBlocks = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numBlocks; i++) {
            const rWidth = 25 + Math.random() * 20; // Blocos bem maiores
            const rHeight = 50 + Math.random() * 40; 
            const rDepth = 25 + Math.random() * 20;
            
            dummy.position.set(
                pos.x + (Math.random() - 0.5) * 15,
                getTerrainHeight(pos.x, pos.z) + rHeight / 2 - 15,
                pos.z + (Math.random() - 0.5) * 15
            );
            dummy.scale.set(rWidth, rHeight, rDepth);
            dummy.rotation.set(
                (Math.random() - 0.5) * 0.1, 
                Math.random() * Math.PI, 
                (Math.random() - 0.5) * 0.1
            );
            dummy.updateMatrix();
            instancedWall.setMatrixAt(idx++, dummy.matrix);
        }
    }
    
    instancedWall.count = idx;
    instancedWall.castShadow = false; // DESABILITADO PARA PERFORMANCE
    instancedWall.receiveShadow = true;
    scene.add(instancedWall);
    arenaWalls.push(instancedWall);
}

function finalizeTrees() {
    const numTrees = treeData.length;
    if (numTrees === 0) return;

    let totalTrunks = 0;
    let totalLeaves = 0;

    for (let i = 0; i < numTrees; i++) {
        const type = treeData[i].type;
        totalTrunks += treeTypes[type].trunks.length;
        totalLeaves += treeTypes[type].leaves.length;
    }

    treeTrunkInstanced = new THREE.InstancedMesh(treeTrunkGeo, woodMat, totalTrunks);
    treeLeaves1Instanced = new THREE.InstancedMesh(treeLeavesGeo, leavesMat, totalLeaves); // We reuse treeLeaves1Instanced variable

    treeTrunkInstanced.matrixAutoUpdate = false;
    treeLeaves1Instanced.matrixAutoUpdate = false;

    const dummy = new THREE.Object3D();
    const baseMatrix = new THREE.Matrix4();
    const localMatrix = new THREE.Matrix4();

    const leafPalette = [
        new THREE.Color(0x4ea640), // vibrant green
        new THREE.Color(0x3a822b), // medium green
        new THREE.Color(0x28631b), // dark green
        new THREE.Color(0x6b8e23), // olive green
        new THREE.Color(0x8cb036), // yellowish green
        new THREE.Color(0x9ca828)  // yellow-green
    ];

    let trunkIdx = 0;
    let leafIdx = 0;

    for (let i = 0; i < numTrees; i++) {
        const data = treeData[i];
        const scale = data.scale;
        const type = data.type;
        const structure = treeTypes[type];

        // Create base matrix for this tree
        baseMatrix.makeTranslation(data.x, data.y, data.z);
        baseMatrix.multiply(new THREE.Matrix4().makeRotationY(data.rotY));
        baseMatrix.scale(new THREE.Vector3(scale, scale, scale));

        // Add trunks
        for (const t of structure.trunks) {
            dummy.position.set(...t.pos);
            dummy.rotation.set(...t.rot);
            dummy.scale.set(...t.scale);
            dummy.updateMatrix();
            localMatrix.copy(baseMatrix).multiply(dummy.matrix);
            treeTrunkInstanced.setMatrixAt(trunkIdx++, localMatrix);
        }

        // Add leaves
        for (const l of structure.leaves) {
            dummy.position.set(...l.pos);
            dummy.rotation.set(0, Math.random() * Math.PI, 0); // Random leaf rotation for variety
            dummy.scale.set(...l.scale);
            dummy.updateMatrix();
            localMatrix.copy(baseMatrix).multiply(dummy.matrix);
            treeLeaves1Instanced.setMatrixAt(leafIdx, localMatrix);
            
            // Randomly select a color from the palette for this leaf cluster
            const randomColor = leafPalette[Math.floor(Math.random() * leafPalette.length)];
            treeLeaves1Instanced.setColorAt(leafIdx, randomColor);
            
            leafIdx++;
        }
    }

    if (totalLeaves > 0) {
        treeLeaves1Instanced.instanceColor.needsUpdate = true;
    }

    treeTrunkInstanced.castShadow = false; // DESABILITADO PARA PERFORMANCE
    treeTrunkInstanced.receiveShadow = true;
    treeLeaves1Instanced.castShadow = false; // DESABILITADO PARA PERFORMANCE
    treeLeaves1Instanced.receiveShadow = true;

    scene.add(treeTrunkInstanced);
    scene.add(treeLeaves1Instanced);
}

function spawnTrees() {
    const numTrees = 3000;
    const safeZoneX = sizeX / 2 + 20;
    const safeZoneZ = sizeZ / 2 + 20;

    for (let i = 0; i < numTrees; i++) {
        const treeX = (Math.random() - 0.5) * 1000;
        const treeZ = (Math.random() - 0.5) * 1000;

        // Evita área central onde a batalha ocorre para não poluir
        if (Math.abs(treeX) > safeZoneX || Math.abs(treeZ) > safeZoneZ) {
            spawnTree(treeX, treeZ);
        } else {
            // Mais árvores espalhadas dentro da arena
            if (Math.random() > 0.70) {
                spawnTree(treeX, treeZ);
            }
        }
    }
    finalizeTrees();
}

const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, flatShading: true, roughness: 0.9, metalness: 0.1 });
const leavesMat = new THREE.MeshStandardMaterial({ color: 0x4ea640, flatShading: true, roughness: 0.8, metalness: 0.1 }); // Vibrant green

const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 5);
treeTrunkGeo.translate(0, 1.5, 0); // Origin at bottom

const treeLeavesGeo = new THREE.IcosahedronGeometry(1.5, 0);

// Define structures for the 3 tree types
const treeTypes = [
    // Type 0: Dead tree (only trunks/branches)
    {
        trunks: [
            { pos: [0, 0, 0], scale: [1.2, 1.2, 1.2], rot: [0.1, 0, 0.1] },
            { pos: [-0.3, 3.5, 0.3], scale: [0.8, 1.0, 0.8], rot: [-0.2, 0, -0.2] },
            { pos: [0.3, 6.3, -0.2], scale: [0.5, 0.8, 0.5], rot: [0.3, 0, 0.1] },
            { pos: [-0.2, 2.5, 0.2], scale: [0.4, 0.8, 0.4], rot: [-0.6, 0.5, 0.2] },
            { pos: [-0.4, 5.0, 0.2], scale: [0.3, 0.7, 0.3], rot: [0.2, -0.5, -0.8] },
            { pos: [0.2, 6.0, -0.1], scale: [0.2, 0.6, 0.2], rot: [-0.3, 0.2, 0.6] }
        ],
        leaves: []
    },
    // Type 1: Medium tree
    {
        trunks: [
            { pos: [0, 0, 0], scale: [1.2, 1.2, 1.2], rot: [0.1, 0, 0.1] },
            { pos: [-0.3, 3.5, 0.3], scale: [0.8, 1.0, 0.8], rot: [-0.2, 0, -0.2] },
            { pos: [0.3, 6.3, -0.2], scale: [0.5, 0.8, 0.5], rot: [0.3, 0, 0.1] },
            { pos: [-0.2, 2.5, 0.2], scale: [0.4, 0.8, 0.4], rot: [-0.6, 0.5, 0.2] },
            { pos: [-0.4, 5.0, 0.2], scale: [0.3, 0.7, 0.3], rot: [0.2, -0.5, -0.8] },
            { pos: [0.2, 6.0, -0.1], scale: [0.2, 0.6, 0.2], rot: [-0.3, 0.2, 0.6] }
        ],
        leaves: [
            { pos: [0.8, 8.5, 0], scale: [1.4, 1.2, 1.4] },
            { pos: [-1.2, 4.5, 1.0], scale: [1.1, 1.0, 1.1] },
            { pos: [-1.5, 6.5, -0.5], scale: [1.2, 1.1, 1.2] },
            { pos: [1.0, 7.5, 0.8], scale: [1.0, 1.0, 1.0] }
        ]
    },
    // Type 2: Full tree
    {
        trunks: [
            { pos: [0, 0, 0], scale: [1.2, 1.2, 1.2], rot: [0.1, 0, 0.1] },
            { pos: [-0.3, 3.5, 0.3], scale: [0.8, 1.0, 0.8], rot: [-0.2, 0, -0.2] },
            { pos: [0.3, 6.3, -0.2], scale: [0.5, 0.8, 0.5], rot: [0.3, 0, 0.1] },
            { pos: [-0.2, 2.5, 0.2], scale: [0.4, 0.8, 0.4], rot: [-0.6, 0.5, 0.2] },
            { pos: [-0.4, 5.0, 0.2], scale: [0.3, 0.7, 0.3], rot: [0.2, -0.5, -0.8] },
            { pos: [0.2, 6.0, -0.1], scale: [0.2, 0.6, 0.2], rot: [-0.3, 0.2, 0.6] }
        ],
        leaves: [
            { pos: [0.8, 8.5, 0], scale: [1.6, 1.4, 1.6] },
            { pos: [-1.2, 4.5, 1.0], scale: [1.4, 1.3, 1.4] },
            { pos: [-1.5, 6.5, -0.5], scale: [1.5, 1.4, 1.5] },
            { pos: [1.0, 7.5, 0.8], scale: [1.3, 1.2, 1.3] },
            { pos: [-0.5, 7.5, 1.2], scale: [1.5, 1.3, 1.5] },
            { pos: [1.5, 6.5, -0.5], scale: [1.4, 1.3, 1.4] },
            { pos: [0, 10.0, -0.5], scale: [1.2, 1.1, 1.2] }
        ]
    }
];

function spawnTree(x, z) {
    const terrainY = getTerrainHeight(x, z);
    const scale = 0.8 + Math.random() * 0.4;
    const rotY = Math.random() * Math.PI * 2;
    // 10% dead, 40% medium, 50% full
    const r = Math.random();
    const type = r < 0.1 ? 0 : (r < 0.5 ? 1 : 2);
    treeData.push({ x, y: terrainY, z, scale, rotY, type });
    treePositions.push(new THREE.Vector3(x, terrainY, z));
}

// --- GERADOR DE OBSTÁCULOS (PEDRAS E TRONCOS) ---
function spawnObstacle(x, z) {
    const obsGroup = new THREE.Group();
    const type = Math.random() > 0.5 ? 'rock' : 'stump';
    
    // Raio base para colisão
    const radius = 1.0 + Math.random() * 1.0; 
    const terrainY = getTerrainHeight(x, z);
    
    if (type === 'rock') {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: true, roughness: 0.9, metalness: 0.1 });
        const numRocks = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numRocks; i++) {
            const rRadius = (radius * 0.4) + Math.random() * (radius * 0.4);
            const rockGeo = new THREE.DodecahedronGeometry(rRadius, 0);
            const rockMesh = new THREE.Mesh(rockGeo, rockMat);
            
            // Posiciona em volta do centro
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (radius * 0.6);
            rockMesh.position.set(
                Math.cos(angle) * dist, 
                rRadius * 0.4, 
                Math.sin(angle) * dist
            );
            
            rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            rockMesh.scale.set(1, 0.6 + Math.random() * 0.5, 1);
            obsGroup.add(rockMesh);
        }
    } else {
        const stumpMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, flatShading: true, roughness: 0.9, metalness: 0.1 });
        const height = 0.8 + Math.random() * 0.6;
        // Tronco low poly (6 ou 7 lados)
        const stumpGeo = new THREE.CylinderGeometry(radius * 0.7, radius, height, 6);
        const stumpMesh = new THREE.Mesh(stumpGeo, stumpMat);
        stumpMesh.position.y = height / 2;
        
        // Raiz simples
        if (Math.random() > 0.5) {
            const rootGeo = new THREE.BoxGeometry(radius * 0.6, height * 0.6, radius * 1.5);
            const rootMesh = new THREE.Mesh(rootGeo, stumpMat);
            rootMesh.position.y = height * 0.3;
            rootMesh.rotation.y = Math.random() * Math.PI;
            obsGroup.add(rootMesh);
        }
        
        obsGroup.add(stumpMesh);
    }
    
    obsGroup.position.set(x, terrainY, z);
    // Rotação aleatória pro grupo
    obsGroup.rotation.y = Math.random() * Math.PI * 2;
    scene.add(obsGroup);
    
    // Adicionar à lista de colisões (com um length minúsculo para evitar erro de divisão por zero no warrior.js)
    fallenLogs.push({
        mesh: obsGroup,
        x: x,
        z: z,
        y: terrainY,
        radius: radius,
        length: 0.1, 
        ax: x - 0.05,
        az: z,
        bx: x + 0.05,
        bz: z,
        dirX: 1,
        dirZ: 0
    });
}