document.addEventListener('DOMContentLoaded', function() {
    // --- Seletores Globais ---
    const adminView = document.getElementById('admin-manage-users-view');
    const accessDeniedView = document.getElementById('access-denied');
    const loginPromptView = document.getElementById('login-prompt-admin-users');
    const userGreeting = document.getElementById('user-greeting');
    const userAvatar = document.getElementById('user-avatar');
    const logoutButton = document.getElementById('logout-button');
    const usersTableBody = document.getElementById('users-table-body');
    const noUsersMessage = document.getElementById('no-users-message');
    const messageContainer = document.getElementById('message-container');
    const openAddUserModalButton = document.getElementById('openAddUserModalButton');

    // Filtros da Tabela de Usuários
    const userSearchInput = document.getElementById('user-search-input');
    const userRoleFilter = document.getElementById('user-role-filter');

    // --- Modal de Usuário (Adicionar/Editar) ---
    const userModal = document.getElementById('userModal');
    const userModalTitle = document.getElementById('userModalTitle');
    const closeUserModalButton = document.getElementById('closeUserModalButton');
    const userModalOverlay = userModal ? userModal.querySelector('.modal-overlay') : null;
    const userForm = document.getElementById('form-user');
    const userIdInput = document.getElementById('userId'); 
    const userNomeInput = document.getElementById('userNome');
    const userUsernameInput = document.getElementById('userUsername'); 
    const userPasswordInput = document.getElementById('userPassword');
    const passwordFieldContainer = document.getElementById('password-field-container');
    const userRoleSelect = document.getElementById('userRole'); 
    const userStatusSelect = document.getElementById('userStatus');
    const statusFieldContainer = document.getElementById('status-field-container');

    // --- Modal de Redefinir Senha ---
    const resetPasswordModal = document.getElementById('resetPasswordModal');
    const resetPasswordForm = document.getElementById('form-reset-password');
    const resetPasswordUserIdInput = document.getElementById('resetPasswordUserId');
    const resetPasswordUserLabel = document.getElementById('resetPasswordUserLabel');
    const newPasswordInput = document.getElementById('newPassword');
    const cancelResetPasswordButton = document.getElementById('cancelResetPassword');
    const confirmResetPasswordButton = document.getElementById('confirmResetPassword');
    const resetPasswordModalOverlay = resetPasswordModal ? resetPasswordModal.querySelector('.modal-overlay-reset') : null;
    
    const backendUrl = 'https://shelfwise-backend-698679522199.southamerica-east1.run.app'; // SUA URL DO CLOUD RUN
    let currentUser = null;
    let isEditMode = false; 
    let allUsersCache = []; // Cache para todos os usuários carregados

    // --- Funções Auxiliares ---
    function showMessage(message, type = 'info') {
        const messageId = 'toast-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `feedback-message feedback-${type}`;
        messageDiv.textContent = message;
        if (messageContainer) messageContainer.appendChild(messageDiv);
        requestAnimationFrame(() => messageDiv.classList.add('show'));
        setTimeout(() => {
            messageDiv.classList.add('fade-out');
            messageDiv.addEventListener('transitionend', () => messageDiv.remove());
        }, 4500);
    }
    
    // --- Autenticação e UI Principal ---
    function setupAdminUI(user) {
        currentUser = user;
        if(userGreeting) userGreeting.textContent = `Olá, ${user.nome || user.username}`;
        if(userAvatar) {
            userAvatar.textContent = (user.nome || user.username).substring(0, 2).toUpperCase();
            userAvatar.classList.remove('hidden');
        }
        if(logoutButton) logoutButton.classList.remove('hidden');
        if(loginPromptView) loginPromptView.classList.add('hidden');
        if(accessDeniedView) accessDeniedView.classList.add('hidden');
        if(adminView) adminView.classList.remove('hidden');
        fetchAndFilterUsers(); // Carrega e aplica filtros iniciais
    }

    function showAccessDenied() {
        if(adminView) adminView.classList.add('hidden');
        if(accessDeniedView) accessDeniedView.classList.remove('hidden');
        if(loginPromptView) loginPromptView.classList.add('hidden');
    }
    function showLoginPrompt() {
        if(adminView) adminView.classList.add('hidden');
        if(accessDeniedView) accessDeniedView.classList.add('hidden');
        if(loginPromptView) loginPromptView.classList.remove('hidden');
    }

    function checkAdminLoginStatus() {
        const loggedInUser = localStorage.getItem('loggedInUser');
        if (loggedInUser) {
            const user = JSON.parse(loggedInUser);
            if (user && user.role === 'admin') {
                setupAdminUI(user);
            } else {
                showAccessDenied();
            }
        } else {
            showLoginPrompt();
        }
    }

    function logout() {
        localStorage.removeItem('loggedInUser');
        window.location.href = "login.html";
    }

    // --- Lógica de CRUD de Usuários ---
    async function fetchAndFilterUsers() {
        if(usersTableBody) usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-500">Carregando usuários...</td></tr>';
        if(noUsersMessage) noUsersMessage.classList.add('hidden');
        try {
            const headers = {};
            if (currentUser && currentUser.username) {
                headers['X-User-Username'] = currentUser.username;
                headers['X-User-Role'] = currentUser.role;
            }
            const response = await fetch(`${backendUrl}/api/admin/usuarios`, { headers: headers });
            if (!response.ok) {
                 const errorData = await response.json().catch(()=> ({erro: `Erro HTTP ${response.status}`}));
                 throw new Error(errorData.erro || 'Falha ao buscar usuários.');
            }
            allUsersCache = await response.json(); // Armazena no cache
            applyUserFiltersAndRender(); // Aplica filtros e renderiza
        } catch (error) {
            showMessage(error.message, 'error');
            if(usersTableBody) usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-red-500">Erro ao carregar usuários.</td></tr>';
        }
    }

    function applyUserFiltersAndRender() {
        if (!usersTableBody || !noUsersMessage || !userSearchInput || !userRoleFilter) return;

        const searchTerm = userSearchInput.value.toLowerCase().trim();
        const roleFilter = userRoleFilter.value;

        const filteredUsers = allUsersCache.filter(user => {
            const matchesSearch = !searchTerm || 
                                  (user.nome && user.nome.toLowerCase().includes(searchTerm)) ||
                                  (user.username && user.username.toLowerCase().includes(searchTerm));
            const matchesRole = !roleFilter || user.role === roleFilter;
            return matchesSearch && matchesRole;
        });
        renderUsersTable(filteredUsers);
    }


    function renderUsersTable(users) {
        if(!usersTableBody || !noUsersMessage) return;
        usersTableBody.innerHTML = '';
        if (users.length === 0) {
            noUsersMessage.textContent = "Nenhum usuário encontrado com os filtros aplicados.";
            noUsersMessage.classList.remove('hidden');
            return;
        }
        noUsersMessage.classList.add('hidden');
        
        users.forEach(user => {
            const row = usersTableBody.insertRow();
            const statusClass = user.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            const nomeDisplay = user.nome || user.username;
            const roleDisplay = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A';

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${nomeDisplay}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.username}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${roleDisplay}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${user.status}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-1">
                    <button class="edit-user-btn text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-100" title="Editar Usuário">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button class="reset-password-btn text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100" title="Redefinir Senha">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM12 14l9-5-9-5-9 5 9 5z" /></svg>
                    </button>
                    <button class="delete-user-btn text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100" title="${user.status === 'ATIVO' ? 'Desativar Usuário' : 'Ativar Usuário'}">
                        ${user.status === 'ATIVO' ? 
                            '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>' :
                            '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
                        }
                    </button>
                </td>
            `;
            row.querySelector('.edit-user-btn').addEventListener('click', () => openUserModal(user));
            row.querySelector('.delete-user-btn').addEventListener('click', () => handleDeleteOrActivateUser(user));
            row.querySelector('.reset-password-btn').addEventListener('click', () => openResetPasswordModal(user.id, user.nome || user.username));
        });
    }

    // --- Lógica dos Modais ---
    function openUserModal(user = null) {
        isEditMode = !!user;
        if(userForm) userForm.reset();
        
        // Popula o select de papéis - AGORA INCLUI CLIENTE
        if(userRoleSelect) {
            userRoleSelect.innerHTML = ''; 
            const allRolesForSelect = ['cliente', 'admin', 'catalogador', 'atendente', 'analista']; // Inclui cliente
            allRolesForSelect.forEach(role => {
                const option = document.createElement('option');
                option.value = role;
                option.textContent = role.charAt(0).toUpperCase() + role.slice(1);
                if (role === 'admin') option.textContent += " (Acesso Total)";
                else if (role === 'catalogador') option.textContent += " (Gerencia Livros)";
                else if (role === 'atendente') option.textContent += " (Gerencia Empréstimos)";
                else if (role === 'analista') option.textContent += " (Visualiza Relatórios)";
                userRoleSelect.appendChild(option);
            });
        }
        
        if (isEditMode && user) {
            if(userModalTitle) userModalTitle.textContent = 'Editar Usuário';
            if(userIdInput) userIdInput.value = user.id; 
            if(userNomeInput) userNomeInput.value = user.nome || '';
            if(userUsernameInput) {
                userUsernameInput.value = user.username;
                userUsernameInput.disabled = true; 
            }
            if(userRoleSelect) userRoleSelect.value = user.role;
            if(userStatusSelect) userStatusSelect.value = user.status || 'ATIVO';
            if(passwordFieldContainer) passwordFieldContainer.classList.remove('hidden'); 
            if(userPasswordInput) userPasswordInput.required = false; 
            if(userPasswordInput) userPasswordInput.placeholder = "Deixe em branco para não alterar";
            if(statusFieldContainer) statusFieldContainer.classList.remove('hidden'); 
        } else {
            if(userModalTitle) userModalTitle.textContent = 'Adicionar Novo Usuário'; // Alterado para ser mais genérico
            if(userIdInput) userIdInput.value = '';
            if(userUsernameInput) userUsernameInput.disabled = false;
            if(passwordFieldContainer) passwordFieldContainer.classList.remove('hidden');
            if(userPasswordInput) userPasswordInput.required = true;
            if(userPasswordInput) userPasswordInput.placeholder = "Mínimo 6 caracteres";
            if(statusFieldContainer) statusFieldContainer.classList.add('hidden'); 
            if(userRoleSelect) userRoleSelect.value = 'cliente'; // Padrão para novo usuário é cliente
        }
        if(userModal) userModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    // ... (Restante das funções: closeUserModal, openResetPasswordModal, closeResetPasswordModal, handleUserFormSubmit, handleDeleteOrActivateUser, handleResetPasswordSubmit)
    // Essas funções permanecem como na versão `manage_users_script_granular_roles` do Canvas.
    // Vou incluí-las abaixo para completude.

    function closeUserModal() {
        if(userModal) userModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    function openResetPasswordModal(userId, userDisplayIdentifier) {
        if(!resetPasswordModal || !resetPasswordForm || !resetPasswordUserIdInput || !resetPasswordUserLabel) return;
        resetPasswordForm.reset();
        resetPasswordUserIdInput.value = userId;
        resetPasswordUserLabel.textContent = userDisplayIdentifier; 
        resetPasswordModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    function closeResetPasswordModal() {
        if(resetPasswordModal) resetPasswordModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    async function handleUserFormSubmit(event) {
        event.preventDefault();
        if(!userForm) return;
        const formData = new FormData(userForm);
        const data = Object.fromEntries(formData.entries());

        if (!isEditMode && (!data.password || data.password.length < 6)) {
            showMessage('A senha é obrigatória e deve ter pelo menos 6 caracteres.', 'error');
            return;
        }
        if (isEditMode && data.password && data.password.length > 0 && data.password.length < 6) {
            showMessage('Se for alterar a senha, ela deve ter pelo menos 6 caracteres.', 'error');
            return;
        }
        if (isEditMode && (!data.password || data.password.trim() === '')) {
            delete data.password;
        }

        const url = isEditMode ? `/api/admin/usuarios/${data.userId}` : '/api/admin/usuarios';
        const method = isEditMode ? 'PUT' : 'POST';
        
        if(isEditMode) {
            delete data.userId; 
            delete data.username; 
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (currentUser && currentUser.username) { 
                headers['X-User-Username'] = currentUser.username;
                headers['X-User-Role'] = currentUser.role;
            }
            const response = await fetch(url, {
                method: method,
                headers: headers,
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || 'Erro desconhecido ao salvar usuário.');
            
            showMessage(result.mensagem || "Usuário salvo com sucesso!", 'success');
            closeUserModal();
            fetchAndFilterUsers(); // Atualiza a tabela
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }
    
    async function handleDeleteOrActivateUser(user) {
        const actionText = user.status === 'ATIVO' ? 'desativar' : 'ativar';
        const newStatus = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
        const userId = user.id; 

        if (currentUser && currentUser.username === userId && actionText === 'desativar' && user.role === 'admin') {
            showMessage("Você não pode desativar sua própria conta de administrador.", "error");
            return;
        }

        if (!confirm(`Tem certeza que deseja ${actionText} o usuário ${user.nome || userId}?`)) return;
        
        const headers = { 'Content-Type': 'application/json' };
        if (currentUser && currentUser.username) { 
            headers['X-User-Username'] = currentUser.username;
            headers['X-User-Role'] = currentUser.role;
        }

        if (actionText === 'desativar') { 
            try {
                const response = await fetch(`${backendUrl}/api/admin/usuarios/${userId}`, { method: 'DELETE', headers: headers }); 
                const result = await response.json();
                if (!response.ok) throw new Error(result.erro || 'Erro ao desativar usuário.');
                showMessage(result.mensagem, 'success');
                fetchAndFilterUsers();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        } else { 
             try {
                const response = await fetch(`${backendUrl}/api/admin/usuarios/${userId}`, { 
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify({ status: newStatus }) 
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.erro || 'Erro ao ativar usuário.');
                showMessage(`Usuário ${user.nome || userId} ${actionText} com sucesso.`, 'success');
                fetchAndFilterUsers();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        }
    }
    
    async function handleResetPasswordSubmit(event) {
        event.preventDefault();
        if(!resetPasswordForm || !resetPasswordUserIdInput || !newPasswordInput) return;

        const userId = resetPasswordUserIdInput.value;
        const newPasswordValue = newPasswordInput.value;

        if (!newPasswordValue || newPasswordValue.length < 6) {
            showMessage('A nova senha é obrigatória e deve ter pelo menos 6 caracteres.', 'error');
            return;
        }
        
        const headers = { 'Content-Type': 'application/json' };
        if (currentUser && currentUser.username) { 
            headers['X-User-Username'] = currentUser.username;
            headers['X-User-Role'] = currentUser.role;
        }

        try {
            const response = await fetch(`${backendUrl}/api/admin/usuarios/${userId}/resetar-senha`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ password: newPasswordValue })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || 'Erro ao redefinir a senha.');

            showMessage(result.mensagem || "Senha redefinida com sucesso!", 'success');
            closeResetPasswordModal();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }
    
    // --- Adicionar Listeners ---
    if(logoutButton) logoutButton.addEventListener('click', logout);
    if(openAddUserModalButton) openAddUserModalButton.addEventListener('click', () => openUserModal());
    if(closeUserModalButton) closeUserModalButton.addEventListener('click', closeUserModal);
    if(userModalOverlay) userModalOverlay.addEventListener('click', closeUserModal);
    if(userForm) userForm.addEventListener('submit', handleUserFormSubmit);
    
    if(resetPasswordForm) resetPasswordForm.addEventListener('submit', handleResetPasswordSubmit);
    if(cancelResetPasswordButton) cancelResetPasswordButton.addEventListener('click', closeResetPasswordModal);
    if(resetPasswordModalOverlay) resetPasswordModalOverlay.addEventListener('click', closeResetPasswordModal);

    // Listeners para os filtros da tabela
    if(userSearchInput) userSearchInput.addEventListener('input', applyUserFiltersAndRender);
    if(userRoleFilter) userRoleFilter.addEventListener('change', applyUserFiltersAndRender);

    // --- Inicialização ---
    const currentYearSpan = document.getElementById('currentYearManageUsers');
    if(currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    
    checkAdminLoginStatus();
});
