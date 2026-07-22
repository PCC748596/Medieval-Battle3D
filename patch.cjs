const fs = require('fs');
let content = fs.readFileSync('public/js/warrior.js', 'utf8');

const targetContent = `            if (currentTheme === 'napoleonic_3d') {
                // --- TEMA NAPOLEÓNICO 3D (modelo GLB externo) ---
                const wrapper = new THREE.Group();
                wrapper.name = "napoleonic_gltf";
                if (typeof napoleonicSoldierGLTF !== 'undefined' && napoleonicSoldierGLTF) {
                    const soldier = napoleonicSoldierGLTF.clone();
                    // Modelo em A-pose: bounding box Y ~[-0.95, 0.95] → escala 1.5 → altura ~2.85
                    soldier.scale.set(1.5, 1.5, 1.5);
                    // Girar 180° para encarar a frente correta (+Z → -Z)
                    soldier.rotation.y = Math.PI;
                    soldier.position.y = 0;
                    wrapper.add(soldier);
                }
                wrapper.position.y = 0;
                template.add(wrapper);
                // Dummies para compatibilidade com a lógica existente
                const dummyArmL = new THREE.Group(); dummyArmL.name = "armL"; template.add(dummyArmL);
                const dummyArmR = new THREE.Group(); dummyArmR.name = "armR"; template.add(dummyArmR);
                const dummyLegL = new THREE.Group(); dummyLegL.name = "legL"; template.add(dummyLegL);
                const dummyLegR = new THREE.Group(); dummyLegR.name = "legR"; template.add(dummyLegR);
                const dummyTorso = new THREE.Group(); dummyTorso.name = "torso"; template.add(dummyTorso);
                const dummyHead = new THREE.Group(); dummyHead.name = "head"; template.add(dummyHead);
                
                templateMeshes[this.faction][this.role] = template;
            } else if (currentTheme === 'napoleonic') {`;

const newContent = `            if (currentTheme === 'napoleonic_3d') {
                // --- TEMA NAPOLEÓNICO 3D (Substituído pelo modelo Low-Poly ultra leve pedido ~84 Tris) ---
                const isFrench = armies[this.faction].isFrench;
                const coatMat = new THREE.MeshLambertMaterial({ color: isFrench ? 0x1f3c73 : 0xb32424 });
                const skinMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
                const pantsMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
                const gunMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

                const torso = new THREE.Group(); torso.name = "torso"; torso.position.y = 0.525; template.add(torso);
                const chest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.45), coatMat);
                chest.position.y = 0.55;
                torso.add(chest);

                const head = new THREE.Group(); head.name = "head"; head.position.y = 1.15; torso.add(head);
                const skull = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
                skull.position.y = 0.225;
                head.add(skull);

                const armL = new THREE.Group(); armL.name = "armL"; armL.position.set(-0.55, 1.275, 0); template.add(armL);
                const sleeveL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), coatMat);
                sleeveL.position.y = -0.4;
                armL.add(sleeveL);

                const armR = new THREE.Group(); armR.name = "armR"; armR.position.set(0.55, 1.275, 0); template.add(armR);
                const sleeveR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), coatMat);
                sleeveR.position.y = -0.4;
                armR.add(sleeveR);
                
                const bowGroup = new THREE.Group(); bowGroup.name = "bowGroup";
                const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 1.8), gunMat);
                gunMesh.position.set(0, 0, 0.5);
                bowGroup.add(gunMesh);
                armR.add(bowGroup);

                const legL = new THREE.Group(); legL.name = "legL"; legL.position.set(-0.25, 0.525, 0); template.add(legL);
                const pantsL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), pantsMat);
                pantsL.position.y = -0.35;
                legL.add(pantsL);

                const legR = new THREE.Group(); legR.name = "legR"; legR.position.set(0.25, 0.525, 0); template.add(legR);
                const pantsR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), pantsMat);
                pantsR.position.y = -0.35;
                legR.add(pantsR);

                templateMeshes[this.faction][this.role] = template;
            } else if (currentTheme === 'napoleonic') {`;

content = content.replace(targetContent, newContent);
fs.writeFileSync('public/js/warrior.js', content, 'utf8');
console.log('File patched');
