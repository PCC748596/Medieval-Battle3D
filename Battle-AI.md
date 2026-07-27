# Plano de Implementação da IA de Batalha Medieval

## Objetivo

Criar uma IA capaz de controlar exércitos de forma convincente, sem utilizar algoritmos pesados em cada soldado. A inteligência deve estar concentrada na tomada de decisão dos grupos, enquanto cada unidade individual executa apenas comportamentos simples.

A arquitetura será dividida em quatro camadas:

1. General
2. Comandantes de Grupo
3. Formação
4. Soldados

Essa arquitetura permitirá batalhas com milhares de unidades mantendo boa performance.

---

# ETAPA 1 — Sistema de Grupos

## Objetivo

Eliminar o conceito de soldados independentes e fazer com que todo soldado pertença a um grupo.

Exemplos:

* Grupo de Infantaria A
* Grupo de Infantaria B
* Grupo de Arqueiros A
* Grupo de Arqueiros B
* Grupo de Catapultas

Cada grupo deve possuir:

* ID
* Tipo (Infantaria, Arqueiros ou Catapulta)
* Lista de soldados
* Centro da formação
* Direção
* Estado atual
* Moral
* Ordem atual
* Alvo atual

O grupo passa a ser a principal unidade de decisão da IA.

---

## Prompt

"Implemente um sistema de grupos para a IA de batalha. Cada grupo deve possuir soldados pertencentes a ele, um centro de formação, direção, moral, estado atual, alvo e ordem ativa. Toda a lógica futura deverá operar sobre grupos e não diretamente sobre soldados."

---

# ETAPA 2 — Sistema de Ordens

Criar um conjunto fixo de ordens.

Ordens:

* Manter posição
* Avançar
* Recuar
* Defender posição
* Flanquear pela esquerda
* Flanquear pela direita
* Bombardear área
* Concentrar fogo
* Reagrupar
* Perseguir

Cada ordem possui uma prioridade.

O grupo nunca decide sozinho.

Ele apenas executa a ordem recebida.

---

## Prompt

"Implemente um sistema de ordens para grupos. Cada grupo deve possuir uma ordem ativa. As ordens definem o comportamento do grupo e substituem decisões individuais."

---

# ETAPA 3 — General (IA Estratégica)

Existe apenas um General por exército.

Ele observa:

* quantidade de infantaria
* quantidade de arqueiros
* quantidade de catapultas
* moral média
* terreno
* distância entre exércitos
* vantagem numérica
* perdas

Com essas informações ele define a estratégia.

Exemplos:

Se possui mais arqueiros:

→ manter distância.

Se possui vantagem de infantaria:

→ avançar.

Se perdeu muitos soldados:

→ recuar.

Se o inimigo está desorganizado:

→ perseguir.

O General nunca movimenta soldados.

Ele apenas envia ordens.

---

## Prompt

"Crie a IA do General. O General analisa o estado geral da batalha e distribui ordens aos grupos. O General não controla soldados individualmente."

---

# ETAPA 4 — Comandantes

Cada grupo possui um comandante.

Ele interpreta a ordem recebida.

Exemplo:

Ordem:

Flanquear esquerda

O comandante calcula:

* caminho
* velocidade
* momento da carga

Sem alterar a estratégia do General.

---

## Prompt

"Implemente uma IA de comandante para cada grupo. O comandante recebe ordens do General e transforma essas ordens em ações concretas para a formação."

---

# ETAPA 5 — Sistema de Formação

Toda infantaria deve lutar em formação.

A formação controla:

* espaçamento
* alinhamento
* direção
* largura
* profundidade

Quando soldados morrem:

A formação reorganiza automaticamente.

Nenhum soldado tenta reorganizar sozinho.

---

## Prompt

"Implemente um sistema de formação para grupos. A formação deve manter alinhamento, espaçamento e reorganizar automaticamente quando ocorrerem baixas."

---

# ETAPA 6 — IA Individual

A IA individual deve ser extremamente simples.

Infantaria:

* seguir formação
* atacar inimigo próximo
* voltar para formação
* perseguir poucos metros

Arqueiros:

* seguir formação
* procurar melhor alvo
* disparar
* recuar quando ameaçados

Catapultas:

* esperar recarga
* mirar
* disparar

Nada além disso.

---

## Prompt

"Reduza a IA individual ao mínimo. Toda decisão estratégica pertence ao comandante e ao General. O soldado apenas reage ao ambiente imediato."

---

# ETAPA 7 — Sistema de Moral

Cada grupo possui moral.

Eventos que reduzem moral:

* muitas mortes
* ataque pelas costas
* ataque pelo flanco
* proximidade de catapultas
* isolamento
* comandante morto (caso exista futuramente)

Eventos que aumentam moral:

* vitória local
* superioridade numérica
* reforços próximos

Baixa moral provoca:

* redução da velocidade
* menor agressividade
* possibilidade de fuga

---

## Prompt

"Implemente um sistema de moral para grupos. A moral influencia a capacidade de manter formação, continuar atacando ou recuar."

---

# ETAPA 8 — Sistema de Flanqueamento

O General verifica:

* existe caminho livre?
* a infantaria inimiga está ocupada?
* há espaço lateral suficiente?

Se sim:

Seleciona um grupo de infantaria.

Esse grupo contorna a batalha.

Enquanto flanqueia:

* evita combate
* mantém formação
* tenta alcançar lateral ou retaguarda

Ao chegar:

Recebe ordem de ataque.

Quando um grupo sofre ataque:

Frente:

100% defesa

Flanco:

redução de defesa

Retaguarda:

redução maior de defesa

Além disso:

* queda de moral
* maior chance de romper formação

---

## Prompt

"Implemente um sistema de flanqueamento. O General deve detectar oportunidades de ataque pelos lados. O grupo designado deve contornar o combate e atacar apenas quando atingir o flanco ou a retaguarda."

---

# ETAPA 9 — Sistema de Arqueiros

Os arqueiros nunca entram em combate corpo a corpo voluntariamente.

Prioridades:

1. Maior concentração de inimigos
2. Infantaria
3. Grupos com baixa moral
4. Grupos atacando aliados

Quando inimigos aproximam:

* recuar
* procurar proteção atrás da infantaria

---

## Prompt

"Implemente uma IA específica para arqueiros. Eles devem priorizar alvos por concentração de tropas, evitar combate corpo a corpo e recuar quando ameaçados."

---

# ETAPA 10 — Sistema de Catapultas

As catapultas analisam:

* maior concentração de inimigos
* distância segura
* risco de fogo amigo

Nunca atiram em grupos aliados.

Possuem:

* tempo de recarga
* tempo para mirar
* dispersão dos projéteis

---

## Prompt

"Implemente uma IA para catapultas. Elas devem escolher áreas de alta concentração inimiga, evitar fogo amigo e respeitar tempos de mira e recarga."

---

# ETAPA 11 — Máquina de Estados

Todos os grupos compartilham a mesma máquina de estados.

Estados:

Esperando

↓

Marchando

↓

Reposicionando

↓

Preparando combate

↓

Combatendo

↓

Perseguindo

↓

Reagrupando

↓

Recuando

↓

Esperando

Cada grupo muda de estado conforme ordens do General e acontecimentos da batalha.

---

## Prompt

"Implemente uma máquina de estados para grupos. Todos os comportamentos da IA devem ser derivados dos estados do grupo e não de decisões independentes dos soldados."

---

# ETAPA 12 — Sistema de Atualização por Frequência

Para garantir desempenho com milhares de soldados:

* General: atualiza a cada 2–5 segundos.
* Comandantes: atualizam cerca de 4 vezes por segundo.
* Formações: atualizam cerca de 10 vezes por segundo.
* Soldados: executam apenas ações locais a cada frame, sem recalcular estratégia.

Assim, a maior parte da inteligência roda poucas vezes por segundo, enquanto os soldados apenas executam as decisões já tomadas.

---

## Prompt

"Otimize a IA utilizando diferentes frequências de atualização. O General deve atualizar raramente, os comandantes em intervalos curtos e os soldados apenas executar ordens locais, garantindo escalabilidade para batalhas com milhares de unidades."

---

# Resultado Esperado

Ao final dessas etapas, a IA deverá se comportar como um exército organizado, e não como centenas de agentes independentes. O General tomará decisões estratégicas, os comandantes coordenarão os grupos, as formações manterão a coesão e os soldados apenas executarão ações simples. Essa arquitetura reduz drasticamente o custo computacional, facilita a manutenção do código e permite adicionar novos sistemas — como experiência, disciplina, clima ou diferentes tipos de terreno — sem alterar a estrutura principal da IA.
