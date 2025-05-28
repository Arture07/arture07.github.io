document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const messageContainer = document.getElementById('message-container');

    function showMessage(message, type = 'error') {
        const messageId = 'toast-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `feedback-message feedback-${type}`;
        messageDiv.textContent = message;
        if (messageContainer) {
            messageContainer.appendChild(messageDiv);
        } else {
            alert(`${type.toUpperCase()}: ${message}`); // Fallback
            return;
        }
        requestAnimationFrame(() => messageDiv.classList.add('show'));
        setTimeout(() => {
            messageDiv.classList.add('fade-out');
            messageDiv.addEventListener('transitionend', () => messageDiv.remove());
        }, 4500);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const nome = document.getElementById('register-nome').value.trim();
            const username = document.getElementById('register-username').value.trim().toLowerCase();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const submitButton = registerForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;

            if (!nome || !username || !password || !confirmPassword) {
                showMessage('Todos os campos são obrigatórios.', 'error');
                return;
            }
            if (password !== confirmPassword) {
                showMessage('As senhas não coincidem.', 'error');
                return;
            }
            if (password.length < 6) {
                showMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
                return;
            }
            // Validação simples de e-mail
            if (!username.includes('@') || !username.split('@')[1].includes('.')) {
                showMessage('Por favor, insira um e-mail válido.', 'error');
                return;
            }


            submitButton.disabled = true;
            submitButton.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Criando conta...`;

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, username, password })
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.erro || `Erro HTTP ${response.status}`);
                }
                showMessage(result.mensagem || 'Conta criada com sucesso! Redirecionando para login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);

            } catch (error) {
                showMessage(error.message, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }
});
