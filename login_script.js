document.addEventListener('DOMContentLoaded', function() {
const backendUrl = 'https://arture07-github-io.onrender.com';
    const loginForm = document.getElementById('login-form');
    const messageContainer = document.getElementById('message-container');

    function showMessage(message, type = 'error') {
        const messageId = 'toast-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `feedback-message feedback-${type}`;
        messageDiv.textContent = message;
        messageContainer.appendChild(messageDiv);

        requestAnimationFrame(() => {
            messageDiv.classList.add('show');
        });

        setTimeout(() => {
            messageDiv.classList.add('fade-out');
            messageDiv.addEventListener('transitionend', () => {
                if (messageContainer.contains(messageDiv)) {
                    messageContainer.removeChild(messageDiv);
                }
            });
        }, 4500);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;

            submitButton.disabled = true;
            submitButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...`;

            if (!username || !password) {
                showMessage('Nome de usuário e senha são obrigatórios.', 'error');
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                return;
            }

            fetch(`${backendUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username, password: password }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        const errorMessage = errData && errData.erro ? errData.erro : `Erro HTTP: ${response.status}`;
                        throw new Error(errorMessage);
                    }).catch(() => {
                        throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.sucesso) {
                    localStorage.setItem('loggedInUser', JSON.stringify({ 
                        username: data.usuario.username, 
                        role: data.usuario.role,
                        nome: data.usuario.nome
                    }));
                    window.location.href = 'index.html';
                } else {
                    showMessage(data.erro || 'Falha no login. Verifique suas credenciais.', 'error');
                }
            })
            .catch(error => {
                console.error('Erro ao fazer login:', error);
                showMessage(`Erro ao fazer login: ${error.message}`, 'error');
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }
});
