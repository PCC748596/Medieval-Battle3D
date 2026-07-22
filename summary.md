FASE 1 foi concluída com sucesso!

Implementamos as otimizações solicitadas para remover as instâncias desnecessárias de objetos no `Warrior`:
1. **Remoção do `THREE.Group` e `this.mesh`**: O `Warrior` agora armazena apenas propriedades matemáticas primitivas (`x, y, z, rotX, rotY, rotZ, animTime`, etc) sem carregar nenhum objeto complexo do Three.js em memória.
2. **Poses por Dummy Object**: Movimentação da lógica de animação visual (rotação dos membros, respiração, e recoil) para o novo método `applyPoseToDummy()`, que é invocado apenas quando o guerreiro for efetivamente renderizado na tela.
3. **RenderList Dinâmico**: Alteramos a função `renderList()` no `game-loop.js` para atualizar as matrizes matemáticas injetando os transformadores matemáticos diretos do "Dummy Object" global e submetendo diretamente aos arrays do `InstancedMesh`.
4. **Resolução de Refêrencias**: Adaptamos todos os cálculos de colisão, distâncias e navegação (`battle.js` e `collision.js`) para buscarem as primitivas matemáticas recém-criadas.
