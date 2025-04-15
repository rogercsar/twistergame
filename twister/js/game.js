// --- Variáveis Globais e Constantes ---
let canvas = null;
let ctx = null;
let canvasArea = null; // Container do canvas e marcadores
let markers = null; // Lista de elementos marcadores (será preenchida no onload)

const CIRCLE_RADIUS = 25;
const PADDING = 10;
const NUM_ROWS = 4;
const NUM_COLS = 6;
const COLORS = ["red", "blue", "yellow", "green"]; // Cores CSS usadas no desenho
const BODY_PARTS = ["Mão Direita", "Mão Esquerda", "Pé Direito", "Pé Esquerdo"]; // Nomes para instruções
const TWISTER_COLORS = ["Vermelho", "Azul", "Amarelo", "Verde"]; // Nomes para instruções

// Constantes para High Score
const HIGH_SCORE_KEY = 'twisterHighScores'; // Chave para localStorage
const MAX_HIGH_SCORES = 10; // Número máximo de pontuações a guardar

// --- Estado do Jogo ---
let currentInstruction = null; // Guarda a instrução atual { part: "...", color: "..." }
let score = 0;
let lives = 3; // Começa com 3 vidas
let gameActive = false; // O jogo começa inativo

// --- Mapeamentos ---
const partToMarkerId = {
    "Mão Esquerda": "marker-hand-left",
    "Mão Direita": "marker-hand-right",
    "Pé Esquerdo": "marker-foot-left",
    "Pé Direito": "marker-foot-right"
};

const instructionColorToCssColor = {
    "Vermelho": "red",
    "Azul": "blue",
    "Amarelo": "yellow",
    "Verde": "green"
};

// (Opcional: Mapeamento reverso, se necessário)
// const cssColorToInstructionColor = { ... };

// --- Funções de Desenho ---
function drawCircle(x, y, radius, color) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawMat() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < NUM_ROWS; row++) {
        for (let col = 0; col < NUM_COLS; col++) {
            let x = PADDING + CIRCLE_RADIUS + col * (CIRCLE_RADIUS * 2 + PADDING);
            let y = PADDING + CIRCLE_RADIUS + row * (CIRCLE_RADIUS * 2 + PADDING);
            let colorIndex = col % COLORS.length;
            let color = COLORS[colorIndex];
            drawCircle(x, y, CIRCLE_RADIUS, color);
        }
    }
}

// Função principal de desenho
function draw() {
    drawMat();
}

// --- Função da Roleta ---
function spin() {
    let randomBodyPartIndex = Math.floor(Math.random() * BODY_PARTS.length);
    let selectedBodyPart = BODY_PARTS[randomBodyPartIndex];
    let randomColorIndex = Math.floor(Math.random() * TWISTER_COLORS.length);
    let selectedColor = TWISTER_COLORS[randomColorIndex];
    return { part: selectedBodyPart, color: selectedColor };
}

// --- Funções de Drag and Drop ---
let activeMarker = null;
let offsetX = 0;
let offsetY = 0;

function startDrag(e) {
    // Só inicia o arraste se o jogo estiver ativo
    if (!gameActive) return;

    activeMarker = e.target.closest('.body-marker');
    if (!activeMarker) return;

    const style = window.getComputedStyle(activeMarker);
    offsetX = e.clientX - parseFloat(style.left);
    offsetY = e.clientY - parseFloat(style.top);

    activeMarker.classList.add('dragging');
    activeMarker.style.cursor = 'grabbing';

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false }); // Adicionado - passive: false para preventDefault
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag); // Adicionado
    document.addEventListener('touchcancel', stopDrag); // Adicionado (para interrupções)
    document.body.style.userSelect = 'none';
}

function drag(e) {
    if (!activeMarker) return;

    // Previne comportamento padrão (importante para touchmove não rolar a página)
    e.preventDefault();

    // Obtém coordenadas corretas
    let currentX, currentY;
    if (e.type.startsWith('touch')) { // Verifica se é evento de toque
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    } else { // Senão, é evento de mouse
        currentX = e.clientX;
        currentY = e.clientY;
    }

    // Calcula nova posição (lógica existente)
    let newX = currentX - offsetX;
    let newY = currentY - offsetY;

    // Aplica nova posição (lógica existente)
    activeMarker.style.left = `${newX}px`;
    activeMarker.style.top = `${newY}px`;
}

function stopDrag() {
    if (!activeMarker) return;

    const markerDropped = activeMarker; // Guarda referência

    markerDropped.classList.remove('dragging');
    markerDropped.style.cursor = 'grab';

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag); // Adicionado
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag); // Adicionado
    document.removeEventListener('touchcancel', stopDrag); // Adicionado
    document.body.style.userSelect = '';

    // Chama a verificação da posição
    checkPlacement(markerDropped);

    activeMarker = null;
}

// --- Lógica do Jogo ---

function getCircleAtPosition(markerX, markerY) {
    if (!canvas) return null;
    const canvasRect = canvas.getBoundingClientRect();
    const x = markerX - canvasRect.left;
    const y = markerY - canvasRect.top;

    for (let row = 0; row < NUM_ROWS; row++) {
        for (let col = 0; col < NUM_COLS; col++) {
            let circleX = PADDING + CIRCLE_RADIUS + col * (CIRCLE_RADIUS * 2 + PADDING);
            let circleY = PADDING + CIRCLE_RADIUS + row * (CIRCLE_RADIUS * 2 + PADDING);
            const distance = Math.sqrt(Math.pow(x - circleX, 2) + Math.pow(y - circleY, 2));

            if (distance < CIRCLE_RADIUS) {
                let colorIndex = col % COLORS.length;
                return {
                    row: row,
                    col: col,
                    color: COLORS[colorIndex] // Retorna a cor CSS
                };
            }
        }
    }
    return null;
}

function checkPlacement(markerElement) {
    if (!gameActive || !currentInstruction || !markerElement) {
        return;
    }

    const expectedMarkerId = partToMarkerId[currentInstruction.part];

    // Verifica se o marcador correto foi movido
    if (markerElement.id !== expectedMarkerId) {
        console.log(`Erro: Marcador errado! Esperado: ${currentInstruction.part}, Movido: ${markerElement.id}`);
        updateLives(lives - 1);
        highlightMarker(currentInstruction.part, true); // Pisca o correto como erro
        // Não gera nova instrução aqui, força o jogador a mover o certo
        return;
    }

    const markerRect = markerElement.getBoundingClientRect();
    const markerCenterX = markerRect.left + markerRect.width / 2;
    const markerCenterY = markerRect.top + markerRect.height / 2;
    const targetCircle = getCircleAtPosition(markerCenterX, markerCenterY);
    const expectedColor = instructionColorToCssColor[currentInstruction.color];

    if (targetCircle && targetCircle.color === expectedColor) {
        // Acerto
        console.log(`Correto! ${currentInstruction.part} no ${currentInstruction.color}`);
        updateScore(score + 10);
        setNewInstruction(); // Próxima rodada
    } else {
        // Erro
        let reason = targetCircle ? `Cor errada (Esperado: ${expectedColor}, Encontrado: ${targetCircle.color})` : "Fora de um círculo.";
        console.log(`Errado! ${currentInstruction.part} no ${currentInstruction.color}. ${reason}`);
        updateLives(lives - 1);
        highlightMarker(currentInstruction.part, true); // Pisca o marcador movido como erro
        // Não gera nova instrução aqui
    }
}

// --- Funções de Atualização de UI ---
function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('scoreDisplay');
    if (scoreDisplay) scoreDisplay.textContent = score;
}

function updateLivesDisplay() {
    const livesDisplay = document.getElementById('livesDisplay');
    if (livesDisplay) livesDisplay.textContent = lives;
}

function updateResultDisplay(text) {
    const resultDisplay = document.getElementById('resultDisplay');
    if (resultDisplay) resultDisplay.textContent = text;
}

// --- Funções de Gerenciamento de High Score ---

function loadHighScores() {
    const scoresJSON = localStorage.getItem(HIGH_SCORE_KEY);
    try {
        return scoresJSON ? JSON.parse(scoresJSON) : [];
    } catch (e) {
        console.error("Erro ao carregar high scores:", e);
        return [];
    }
}

function saveHighScores(scores) {
    try {
        const scoresToSave = scores.slice(0, MAX_HIGH_SCORES);
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scoresToSave));
    } catch (e) {
        console.error("Erro ao salvar high scores:", e);
    }
}

function addHighScore(name, score) {
    if (score <= 0) return;

    const scores = loadHighScores();
    const playerName = name || "Jogador Anônimo";

    const newScoreEntry = { name: playerName, score: score };
    scores.push(newScoreEntry);
    scores.sort((a, b) => b.score - a.score);
    const updatedScores = scores.slice(0, MAX_HIGH_SCORES);
    saveHighScores(updatedScores);
}

function displayHighScores() {
    const listElement = document.getElementById('highScoreList');
    const sectionElement = document.getElementById('highScoreSection');
    const clearButton = document.getElementById('clearScoresButton');

    if (!listElement || !sectionElement || !clearButton) {
        console.error("Elementos do High Score não encontrados.");
        return;
    }

    const scores = loadHighScores();
    listElement.innerHTML = ''; // Limpa lista

    if (scores.length === 0) {
        listElement.innerHTML = '<li>Nenhuma pontuação registrada ainda!</li>';
        clearButton.style.display = 'none';
    } else {
        scores.forEach((scoreEntry, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="score-entry"><span class="score-name">${index + 1}. ${scoreEntry.name}</span><span class="score-value">${scoreEntry.score} pts</span></span>`;
            listElement.appendChild(li);
        });
        clearButton.style.display = 'inline-block';
    }
    sectionElement.style.display = 'block'; // Mostra a seção
}

function clearHighScores() {
    if (confirm("Tem certeza que deseja limpar todo o histórico de pontuações?")) {
        localStorage.removeItem(HIGH_SCORE_KEY);
        displayHighScores(); // Atualiza a exibição
        console.log("Histórico de pontuações limpo.");
    }
}


// --- Funções de Controle de Jogo ---
function updateScore(newScore) {
    score = newScore;
    updateScoreDisplay();
}

function updateLives(newLives) {
    lives = newLives;
    updateLivesDisplay();
    if (lives <= 0 && gameActive) { // Verifica gameActive para não chamar gameOver múltiplas vezes
        gameOver();
    }
}

function gameOver() {
    console.log("Game Over acionado");
    gameActive = false;
    updateResultDisplay(`Game Over! Pontuação Final: ${score}`);

    // --- Salvar e Exibir High Score ---
    const playerName = localStorage.getItem('twisterUsername'); // Pega nome da tela de login
    addHighScore(playerName, score); // Adiciona a pontuação atual ao histórico
    displayHighScores(); // Mostra a lista atualizada

    const spinButton = document.getElementById('spinButton');
    if(spinButton) {
        spinButton.disabled = false; // Reabilita o botão para jogar novamente
        spinButton.textContent = "Jogar Novamente?";
    }
    resetMarkerPositions(); // Reseta posição dos marcadores
    // Remove destaque ativo
    if (highlightTimeout) clearTimeout(highlightTimeout);
    if (markers) markers.forEach(m => m.classList.remove('highlight', 'highlight-error'));
}

function setNewInstruction() {
    if (!gameActive) return;
    currentInstruction = spin();
    updateResultDisplay(`${currentInstruction.part} no ${currentInstruction.color}!`);
    highlightMarker(currentInstruction.part);
}

function startGame() {
    console.log("Iniciando novo jogo...");
    gameActive = true;
    updateScore(0);
    updateLives(3); // Garante que as vidas são resetadas

    // --- Esconder High Scores ao iniciar ---
    const sectionElement = document.getElementById('highScoreSection');
    if (sectionElement) {
        sectionElement.style.display = 'none';
    }

    const spinButton = document.getElementById('spinButton');
    if(spinButton) {
        spinButton.textContent = "Jogo em Andamento"; // Ou pode remover/desabilitar
        spinButton.disabled = true; // Desabilita durante o jogo
    }
    resetMarkerPositions(); // Coloca marcadores na posição inicial
    setNewInstruction(); // Define a primeira instrução
}

// Função para destacar o marcador
let highlightTimeout = null;
function highlightMarker(partName, isError = false) {
    if (!markers) return; // Garante que markers existe

    // Remove destaque anterior
    markers.forEach(m => m.classList.remove('highlight', 'highlight-error'));
    if (highlightTimeout) clearTimeout(highlightTimeout);

    const markerId = partToMarkerId[partName];
    const markerElement = document.getElementById(markerId);
    if (markerElement) {
        const highlightClass = isError ? 'highlight-error' : 'highlight';
        markerElement.classList.add(highlightClass);

        highlightTimeout = setTimeout(() => {
            markerElement.classList.remove(highlightClass);
            highlightTimeout = null;
        }, isError ? 1000 : 1500);
    }
}

// Função para resetar a posição dos marcadores
function resetMarkerPositions() {
    // Corrigido: Posições iniciais corretas e sem duplicatas
    const initialPositions = {
        "marker-hand-left": { top: "10px", left: "-100px" }, // Ajustado de volta para o valor original do HTML
        "marker-hand-right": { top: "70px", left: "-100px" },// Ajustado de volta para o valor original do HTML
        "marker-foot-left": { top: "130px", left: "-100px" }, // Ajustado de volta para o valor original do HTML
        "marker-foot-right": { top: "190px", left: "-100px" } // Ajustado de volta para o valor original do HTML
    };
    if (markers) {
        markers.forEach(marker => {
            const pos = initialPositions[marker.id];
            if (pos) {
                marker.style.top = pos.top;
                marker.style.left = pos.left;
            }
        });
    }
}


// --- Inicialização ÚNICA ---
window.onload = () => {
    // 1. Obter Elementos Essenciais do DOM
    canvas = document.getElementById("canvas");
    canvasArea = document.querySelector('.canvas-area');
    const spinButton = document.getElementById('spinButton');
    const resultDisplay = document.getElementById('resultDisplay');
    // Pega os marcadores e armazena na variável global
    markers = document.querySelectorAll('.body-marker');
    const clearButton = document.getElementById('clearScoresButton'); // Pega o botão de limpar

    if (!canvas || !canvasArea || !spinButton || !resultDisplay || !markers || markers.length === 0) { // Verifica se markers não está vazio
        console.error("Erro: Elementos essenciais do jogo não encontrados ou lista de marcadores vazia!");
        if(resultDisplay) resultDisplay.textContent = "Erro ao carregar interface.";
        return;
    }

    // --- Exibir Mensagem de Boas-Vindas ---
    const welcomeMessageElement = document.getElementById('welcomeMessage');
    const storedUsername = localStorage.getItem('twisterUsername'); // Pega o nome

    if (welcomeMessageElement && storedUsername) {
        welcomeMessageElement.textContent = `Boa sorte, ${storedUsername}!`;
    } else if (welcomeMessageElement) {
        welcomeMessageElement.textContent = 'Prepare-se para jogar!';
    }
    // --- Fim da Mensagem de Boas-Vindas ---

    // 2. Configurar o Canvas
    if (canvas.getContext) {
        ctx = canvas.getContext("2d");
        canvas.width = (PADDING + CIRCLE_RADIUS) * 2 + (NUM_COLS - 1) * (CIRCLE_RADIUS * 2 + PADDING) + PADDING;
        canvas.height = (PADDING + CIRCLE_RADIUS) * 2 + (NUM_ROWS - 1) * (CIRCLE_RADIUS * 2 + PADDING) + PADDING;
        draw(); // Desenha o tapete inicial
    } else {
        console.error("Canvas context não suportado.");
        resultDisplay.textContent = "Erro: Canvas não suportado.";
        return;
    }

    // 3. Configurar Botão "Iniciar"
    spinButton.addEventListener('click', startGame);

    // 4. Configurar Drag and Drop dos Marcadores
    markers.forEach(marker => {
        marker.addEventListener('mousedown', startDrag);
        marker.addEventListener('touchstart', startDrag, { passive: false }); // Adicionado - passive: false é importante para poder usar preventDefault no touchmove
        marker.addEventListener('dragstart', (e) => e.preventDefault());
    });

    // --- Configurar Botão Limpar Histórico ---
    if (clearButton) {
        clearButton.addEventListener('click', clearHighScores);
    } else {
        console.warn("Botão para limpar scores ('clearScoresButton') não encontrado.");
    }

    // 5. Inicializar Displays de UI e Estado Inicial
    updateScoreDisplay(); // Mostra score inicial (0)
    updateLivesDisplay(); // Mostra vidas iniciais (3)
    updateResultDisplay("Clique em Iniciar para começar!");
    resetMarkerPositions(); // Garante que marcadores começam no lugar certo

    // Opcional: Exibir high scores ao carregar a página
    // displayHighScores();

    console.log("Interface pronta. Aguardando início do jogo.");
};
