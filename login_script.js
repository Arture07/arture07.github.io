// Espera o DOM estar completamente carregado
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form'); // Seleciona o formulário de login
    const messageContainer = document.getElementById('message-container'); // Seleciona o container de mensagens

    // Função para exibir mensagens de feedback (toast)
    function showMessage(message, type = 'error') { // Padrão para 'error' na tela de login
        const messageId = 'toast-' + Date.now(); // ID único para a mensagem
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `feedback-message feedback-${type}`; // Aplica classes de estilo
        messageDiv.textContent = message;
        messageContainer.appendChild(messageDiv); // Adiciona ao DOM

        // Animação de entrada da mensagem
        requestAnimationFrame(() => {
            messageDiv.classList.add('show');
        });
        
        // Remove a mensagem após um tempo
        setTimeout(() => {
            messageDiv.classList.add('fade-out'); // Adiciona classe para animação de saída
            messageDiv.addEventListener('transitionend', () => { // Remove o elemento após a transição
                 if (messageContainer.contains(messageDiv)) {
                    messageContainer.removeChild(messageDiv);
                }
            });
        }, 4500); // Tempo total: 4.5s para animação + 0.5s para fadeOut
    }


    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Impede o comportamento padrão de submissão do formulário
            
            // Coleta os dados do formulário
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value; // Senhas não devem ter trim()
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent; // Salva o texto original do botão

            // Desabilita o botão e mostra indicador de carregamento
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...`;

            // Validação básica no frontend
            if (!username || !password) {
                showMessage('Nome de usuário e senha são obrigatórios.', 'error');
                submitButton.disabled = false; // Reabilita o botão
                submitButton.textContent = originalButtonText; // Restaura o texto do botão
                return;
            }

            // Faz a requisição para a API de login
            fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username, password: password }), // Envia os dados como JSON
            })
            .then(response => { // Trata a resposta da API
                if (!response.ok) { // Se a resposta não for OK (ex: 400, 401, 500)
                     return response.json().then(errData => { // Tenta pegar a mensagem de erro do corpo da resposta
                        const errorMessage = errData && errData.erro ? errData.erro : `Erro HTTP: ${response.status}`;
                        throw new Error(errorMessage);
                    }).catch(() => { // Se não houver corpo JSON ou falhar
                        throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
                    });
                }
                return response.json(); // Converte a resposta para JSON se OK
            })
            .then(data => { // Trata os dados da resposta JSON
                if (data.sucesso) {
                    // Armazena dados do usuário no localStorage para simular sessão
                    localStorage.setItem('loggedInUser', JSON.stringify({ 
                        username: data.usuario.username, 
                        role: data.usuario.role,
                        nome: data.usuario.nome // Garante que o nome seja salvo
                    }));                    // Redireciona para a página principal da biblioteca
                    window.location.href = 'index.html'; 
                } else {
                    showMessage(data.erro || 'Falha no login. Verifique suas credenciais.', 'error');
                }
            })
            .catch(error => { // Trata erros de rede ou da lógica anterior
                console.error('Erro ao fazer login:', error);
                showMessage(`Erro ao fazer login: ${error.message}`, 'error');
            })
            .finally(() => { // Executa sempre, independentemente de sucesso ou falha
                submitButton.disabled = false; // Reabilita o botão
                submitButton.textContent = originalButtonText; // Restaura o texto do botão
            });
        });
    }
});
