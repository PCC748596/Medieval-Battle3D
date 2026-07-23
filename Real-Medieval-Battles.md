As Batalhas não estão boas. Temos que revisar tudo. Fazer uma auditoria nos processos e criar um sistema que
funciona como realmente eram as batalhas medievais.
Vamos criar uma sequencia para a implantação da Real-Medieval-Battle-system, junto com um plano de implementação.

Composição do exército

Normalmente havia quatro tipos principais.

Lanceiros / Infantaria pesada
Formavam a linha principal.
Escudos e lanças de 2–4 metros.
Eram a "parede" do exército.

Representavam cerca de 40–60% do efetivo.

Espadachins

Entravam quando a formação começava a quebrar.

Funções:

Combate corpo a corpo.
Proteção dos arqueiros.
Explorar brechas.

Representavam cerca de 15–30%.

Arqueiros

Muito mais importantes do que os filmes mostram.

Funções:

Enfraquecer o inimigo.
Matar cavalos.
Quebrar moral.

Normalmente 15–40% do exército.

Os ingleses ficaram famosos pelos arqueiros de arco longo.

Cavalaria

Era a tropa mais cara.

Funções:

Ataque pelos flancos.
Perseguir inimigos em fuga.
Proteger alas.

Representava apenas 5–15%.

Filmes fazem parecer que metade do exército era cavaleiro. Na realidade, eram poucos.

Como começava uma batalha
1. Reconhecimento

Os comandantes estudavam:

terreno
rios
colinas
florestas
vento
posição do sol

Muitas batalhas eram vencidas antes do primeiro ataque.

2. Formação

Os exércitos ficavam alinhados.

Podiam permanecer horas olhando um para o outro.

Ninguém queria atacar primeiro.

3. Arqueiros

As primeiras flechas começavam.

Objetivos:

causar baixas
provocar
fazer o inimigo avançar
4. Avanço da infantaria

Os lanceiros caminhavam lentamente.

Não corriam.

Uma corrida de centenas de metros destruía a formação.

5. Choque

Quando as linhas se encontravam...

Não era uma "briga generalizada".

Era mais parecido com duas paredes empurrando uma à outra.

██████████
>>>>>>>>>>>

<<<<<<<<<<
██████████

Quem quebrasse a formação primeiro normalmente perdia.

6. Cavalaria

Entrava somente quando havia oportunidade.

Atacar uma parede de lanças era quase suicídio.

Por isso buscavam:

flancos
arqueiros
soldados em fuga
7. Colapso

Quando um lado começava a fugir...

A batalha praticamente acabava.

Grande parte das mortes acontecia justamente durante a perseguição.

Formações comuns
Linha
██████████████

Mais usada.

Bloco profundo
████
████
████
████

Mais resistente.

Cunha

Muito usada por cavaleiros.

   X
  XXX
 XXXXX
XXXXXXX

Servia para romper uma linha.

Parede de escudos
[ ][ ][ ][ ][ ]
[ ][ ][ ][ ][ ]

Muito usada até o século XI.

Importância do terreno

Era talvez o fator mais decisivo.

Colina

Vantagem enorme.

Subir atacando cansava muito.

Lama

Podia decidir uma batalha inteira.

Em Agincourt, os franceses pesadamente armados afundaram no terreno encharcado.

Florestas

Excelente para emboscadas.

Ruim para cavalaria.

Rios

Muito perigosos.

Cruzar um rio sob ataque era um pesadelo.

Moral

Provavelmente o fator mais importante.

Quando um grupo começava a fugir, o restante frequentemente seguia.

Os comandantes usavam:

bandeiras
tambores
trombetas
gritos
estandartes

para manter a coesão.

Logística

Mover um exército era extremamente difícil.

Um exército de 10.000 homens consumia diariamente enormes quantidades de:

comida
água
madeira
flechas
forragem para cavalos

Por isso, muitas campanhas terminavam por falta de suprimentos antes mesmo de uma grande batalha.

Em vez de um sistema de "pedra-papel-tesoura", você pode dar destaque a fatores históricos como:

Coesão da formação (unidades organizadas lutam melhor).
Moral (baixas, ataques pelos flancos e morte do comandante podem provocar fuga).
Fadiga (correr ou lutar por muito tempo reduz a eficiência).
Terreno (lama, colinas, florestas e rios alteram bastante o desempenho).
Comando (unidades próximas ao comandante respondem mais rapidamente às ordens).

Esse tipo de sistema costuma produzir batalhas que lembram muito mais os confrontos medievais históricos do que simplesmente aumentar o dano ou a vida das unidades.

Lanceiros

Missão principal:

Manter a linha.

Eles não querem matar. Querem impedir que o inimigo avance.

ROOT

→ Estou em formação?
      NÃO
          → Voltar para posição

      SIM

→ Recebi ordem de avançar?
      NÃO
          → Permanecer parado
          → Manter espaçamento
          → Virar para inimigo

      SIM

→ Existe inimigo à frente?

      NÃO
          → Avançar

      SIM

→ É cavalaria?

      SIM
          → Baixar lanças
          → Travar posição

      NÃO

→ Estou cercado?

      SIM
          → Recuar lentamente

      NÃO

→ Atacar

Prioridades:

manter posição
manter formação
atacar

Nunca sair perseguindo alguém.

Guerreiro (Espadachim)

Missão:

Criar brechas.

ROOT

→ Existe lanceiro aliado próximo?

      SIM
          → Permanecer atrás

      NÃO
          → Procurar linha amiga

↓

Existe brecha?

      SIM
          → Entrar

      NÃO
          → Esperar

↓

Inimigo isolado?

      SIM
          → Cercar

      NÃO

↓

Inimigo de costas?

      SIM
          → Priorizar

↓

Lutar

O guerreiro é muito mais "agressivo".

Pode perseguir por pequenas distâncias.

Arqueiro

Missão:

Atirar sem morrer.

ROOT

↓

Existe alvo?

     NÃO

          → Procurar

↓

Existe aliado entre mim e o alvo?

     SIM

          → Não atirar

↓

Alvo dentro do alcance?

      NÃO

           → Aproximar

↓

Existe cavalaria chegando?

      SIM

           → Fugir

↓

Estou sem flechas?

      SIM

           → Recuar

↓

Atirar

Depois de cada disparo:

Disparar

↓

Mover 2 metros

↓

Disparar

↓

Mover

↓

Disparar

Isso evita que todos fiquem exatamente na mesma posição.

Cavalaria

Missão:

Não atacar a frente.

ROOT

↓

Existe arqueiro inimigo?

      SIM

           → Flanquear

↓

Existe infantaria isolada?

      SIM

          → Carga

↓

Existe lanceiro?

      SIM

          → Evitar

↓

Existe inimigo fugindo?

      SIM

          → Perseguir

↓

Esperar oportunidade

A cavalaria quase nunca deveria entrar de frente.

Um comportamento que quase nenhum RTS faz

Os soldados olham para os lados.

A cada segundo

↓

Tenho aliados?

↓

Esquerda

Direita

Frente

Atrás

↓

A formação está inteira?

↓

SIM

    Lutar

↓

NÃO

    Ajustar posição

Isso deixa a linha muito bonita.

██████████████

Em vez disso:

██ ███ █ ██  █
Moral

Todos possuem.

ROOT

↓

Recebi dano?

↓

Sim

↓

Moral -= 2

↓

Aliado morreu perto?

↓

Moral -= 5

↓

General morreu?

↓

Moral -= 40

↓

Estou cercado?

↓

Moral -= 20

↓

Moral < 20 ?

↓

Fugir

Isso gera o famoso efeito dominó.

Fadiga
Parado

↓

Recupera energia

↓

Andando

↓

Consome pouco

↓

Correndo

↓

Consome bastante

↓

Lutando

↓

Consome muito

↓

Energia < 30

↓

Ataca mais devagar

↓

Corre menos

↓

Bloqueia menos
O mais importante: IA em camadas

É aqui que muitos jogos simples se complicam desnecessariamente. Em vez de cada unidade decidir tudo sozinha, organize a IA em quatro níveis:

GENERAL
      ↓
BRIGADA
      ↓
FORMAÇÃO
      ↓
SOLDADO
General

Decide objetivos estratégicos:

Atacar.
Defender.
Flanquear.
Recuar.
Concentrar forças.
Brigada

Coordena grupos de 50–300 homens:

"Avançar até aquela colina."
"Proteger os arqueiros."
"Segurar a ala esquerda."
Formação

Mantém a geometria do grupo:

Espaçamento.
Direção.
Velocidade.
Coesão.
Reorganização após perdas.
Soldado

Só toma decisões locais:

Atacar o inimigo mais próximo.
Manter posição na formação.
Evitar colisões.
Bloquear.
Fugir se a moral quebrar.

Vamos criar uma IA híbrida:

General: atualiza a cada 2–5 segundos.
Brigada: atualiza a cada 0,5–1 segundo.
Formação: atualiza a cada 0,2 segundo.
Soldado: executa apenas uma árvore muito pequena (5–8 nós) a cada 100–200 ms, usando o estado da formação como referência.

Assim, cada soldado não precisa "pensar" em estratégia. Ele apenas reage ao contexto fornecido pelos níveis superiores, o que reduz drasticamente o custo computacional e produz movimentos mais coordenados. Esse tipo de arquitetura é bastante próximo da usada em jogos de batalha em larga escala e se encaixa muito bem no simulador histórico que você está construindo.