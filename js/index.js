// js/index.js

// Pega os elementos do DOM
const usernameInput = document.getElementById('usernameInput');
const startButton = document.getElementById('startButton');
const errorMessage = document.getElementById('error-message');

// Adiciona um listener para o clique no botão
startButton.addEventListener('click', () => {
    // Pega o valor do input, removendo espaços extras no início/fim
    const username = usernameInput.value.trim();

    // Verifica se o nome não está vazio
    if (username) {
        // Esconde mensagem de erro (caso estivesse visível)
        errorMessage.style.display = 'none';

        // Guarda o nome no localStorage para ser usado na próxima página
        localStorage.setItem('twisterUsername', username); // Usando chave específica

        // Redireciona o usuário para a página do jogo
        window.location.href = 'game.html'; // Certifique-se que o nome do arquivo está correto

    } else {
        // Mostra uma mensagem de erro se o nome estiver vazio
        errorMessage.textContent = 'Por favor, digite seu nome para continuar.';
        errorMessage.style.display = 'block';
        usernameInput.focus(); // Coloca o foco de volta no campo de nome
        console.error("Nome de usuário não fornecido.");
    }
});

// (Opcional) Adiciona listener para a tecla Enter no campo de input
usernameInput.addEventListener('keypress', (event) => {
    // Verifica se a tecla pressionada foi Enter (código 13)
    if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault(); // Previne o comportamento padrão do Enter (se houver)
        startButton.click(); // Simula um clique no botão de iniciar
    }
});
