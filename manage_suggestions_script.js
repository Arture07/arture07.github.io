document.addEventListener('DOMContentLoaded', function() {
    console.log("manage_suggestions_script.js: DOM Carregado.");

    const adminView = document.getElementById('admin-manage-suggestions-view');
    const accessDeniedView = document.getElementById('access-denied');
    const loginPromptView = document.getElementById('login-prompt-admin-suggestions');
    const userGreeting = document.getElementById('user-greeting');
    const userAvatar = document.getElementById('user-avatar');
    const logoutButton = document.getElementById('logout-button');
    const suggestionsTableBody = document.getElementById('suggestions-table-body');
    const noSuggestionsMessage = document.getElementById('no-suggestions-message');
    const messageContainer = document.getElementById('message-container');
    
    const searchInput = document.getElementById('suggestion-search-input');
    const statusFilter = document.getElementById('suggestion-status-filter');

    // Modal de Feedback
    const feedbackModal = document.getElementById('suggestionFeedbackModal');
    const feedbackModalTitle = document.getElementById('suggestionFeedbackModalTitle');
    const closeFeedbackModalButton = document.getElementById('closeSuggestionFeedbackModalButton');
    const feedbackModalOverlay = feedbackModal ? feedbackModal.querySelector('.modal-overlay') : null;
    const formFeedback = document.getElementById('formSuggestionFeedback');
    const feedbackSuggestionIdInput = document.getElementById('feedbackSuggestionId');
    const feedbackNewStatusInput = document.getElementById('feedbackNewStatus');
    const adminFeedbackTextInput = document.getElementById('adminFeedbackText');
    const cancelFeedbackButton = document.getElementById('cancelSuggestionFeedbackButton');
    // const confirmFeedbackButton = document.getElementById('confirmSuggestionFeedbackButton'); // É o submit do form

    const backendUrl = 'https://shelfwise-backend-698679522199.southamerica-east1.run.app'; // SUA URL DO CLOUD RUN

    let currentUser = null;
    let allSuggestionsCache = [];

    function showMessage(message, type = 'info') {
        const messageId = 'toast-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `feedback-message feedback-${type}`;
        messageDiv.textContent = message;
        if (messageContainer) messageContainer.appendChild(messageDiv);
        else { console.warn("Message container não encontrado."); alert(message); return; }
        requestAnimationFrame(() => { messageDiv.classList.add('show'); });
        setTimeout(() => {
            messageDiv.classList.add('fade-out');
            messageDiv.addEventListener('transitionend', () => messageDiv.remove());
        }, 4500);
    }
    
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
        fetchAllSuggestions();
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
            try {
                const user = JSON.parse(loggedInUser);
                if (user && user.role === 'admin') { // Somente admin pode gerenciar sugestões
                    setupAdminUI(user);
                } else {
                    showAccessDenied();
                }
            } catch(e) {
                localStorage.removeItem('loggedInUser');
                showLoginPrompt();
            }
        } else {
            showLoginPrompt();
        }
    }

    function logout() {
        localStorage.removeItem('loggedInUser');
        window.location.href = "login.html";
    }

    async function fetchAllSuggestions() {
        if(!suggestionsTableBody || !noSuggestionsMessage) return;
        suggestionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-gray-500">Carregando sugestões...</td></tr>';
        noSuggestionsMessage.classList.add('hidden');
        try {
            const headers = {};
            if (currentUser && currentUser.username) {
                headers['X-User-Username'] = currentUser.username; // Simulação para backend
                headers['X-User-Role'] = currentUser.role;       // Simulação para backend
            }
            const response = await fetch(`${backendUrl}/api/admin/sugestoes`, { headers });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.erro || `Erro HTTP ${response.status}`);
            }
            allSuggestionsCache = await response.json();
            applySuggestionFiltersAndRender();
        } catch (error) {
            showMessage(`Erro ao carregar sugestões: ${error.message}`, 'error');
            if(suggestionsTableBody) suggestionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-red-500">Falha ao carregar sugestões.</td></tr>';
        }
    }

    function applySuggestionFiltersAndRender() {
        if (!allSuggestionsCache || !searchInput || !statusFilter) return;
        const searchTerm = searchInput.value.toLowerCase().trim();
        const statusValue = statusFilter.value;

        const filtered = allSuggestionsCache.filter(sug => {
            const matchesSearch = !searchTerm ||
                (sug.titulo_sugerido && sug.titulo_sugerido.toLowerCase().includes(searchTerm)) ||
                (sug.autor_sugerido && sug.autor_sugerido.toLowerCase().includes(searchTerm)) ||
                (sug.sugerido_por_nome && sug.sugerido_por_nome.toLowerCase().includes(searchTerm)) ||
                (sug.sugerido_por_username && sug.sugerido_por_username.toLowerCase().includes(searchTerm));
            const matchesStatus = !statusValue || sug.status_sugestao === statusValue;
            return matchesSearch && matchesStatus;
        });
        renderSuggestionsTable(filtered);
    }

    function renderSuggestionsTable(sugestoes) {
        if (!suggestionsTableBody || !noSuggestionsMessage) return;
        suggestionsTableBody.innerHTML = '';
        if (sugestoes.length === 0) {
            noSuggestionsMessage.textContent = "Nenhuma sugestão encontrada com os filtros aplicados.";
            noSuggestionsMessage.classList.remove('hidden');
            return;
        }
        noSuggestionsMessage.classList.add('hidden');

        sugestoes.forEach(sug => {
            const row = suggestionsTableBody.insertRow();
            const dataSugestao = sug.data_sugestao ? new Date(sug.data_sugestao).toLocaleDateString('pt-BR') : 'N/A';
            
            let statusClass = 'bg-gray-100 text-gray-800';
            let statusText = sug.status_sugestao.charAt(0).toUpperCase() + sug.status_sugestao.slice(1);
            if (sug.status_sugestao === 'aprovada') { statusClass = 'bg-green-100 text-green-800'; statusText = 'Aprovada'; }
            else if (sug.status_sugestao === 'rejeitada') { statusClass = 'bg-red-100 text-red-800'; statusText = 'Rejeitada'; }
            else if (sug.status_sugestao === 'adquirido') { statusClass = 'bg-blue-100 text-blue-800'; statusText = 'Adquirido'; }
            else if (sug.status_sugestao === 'pendente') { statusClass = 'bg-yellow-100 text-yellow-800'; statusText = 'Pendente'; }

            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900" title="${sug.titulo_sugerido}">${sug.titulo_sugerido}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500" title="${sug.autor_sugerido}">${sug.autor_sugerido}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell" title="${sug.sugerido_por_nome} (${sug.sugerido_por_username})">${sug.sugerido_por_nome || 'N/A'} (${sug.sugerido_por_username})</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">${dataSugestao}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${statusText}</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-center text-sm font-medium table-cell-actions">
                    ${sug.status_sugestao === 'pendente' ? `
                        <button class="approve-suggestion-btn text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-100" title="Aprovar Sugestão">Aprovar</button>
                        <button class="reject-suggestion-btn text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 ml-2" title="Rejeitar Sugestão">Rejeitar</button>
                    ` : ''}
                    ${sug.status_sugestao === 'aprovada' ? `
                        <button class="acquired-suggestion-btn text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100" title="Marcar como Adquirido">Adquirido</button>
                    ` : ''}
                    ${sug.observacao_cliente ? `<button class="view-observation-btn text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 ml-2" title="${sug.observacao_cliente}"><svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></button>` : ''}
                     ${sug.admin_feedback ? `<button class="view-admin-feedback-btn text-purple-500 hover:text-purple-700 p-1 rounded hover:bg-purple-100 ml-2" title="Ver Feedback Admin: ${sug.admin_feedback}"><svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></button>` : ''}
                </td>
            `;
            // Adicionar listeners para os botões de ação
            const approveBtn = row.querySelector('.approve-suggestion-btn');
            if(approveBtn) approveBtn.addEventListener('click', () => openFeedbackModal(sug.id_sugestao, 'aprovada', sug.titulo_sugerido));
            
            const rejectBtn = row.querySelector('.reject-suggestion-btn');
            if(rejectBtn) rejectBtn.addEventListener('click', () => openFeedbackModal(sug.id_sugestao, 'rejeitada', sug.titulo_sugerido));

            const acquiredBtn = row.querySelector('.acquired-suggestion-btn');
            if(acquiredBtn) acquiredBtn.addEventListener('click', () => openFeedbackModal(sug.id_sugestao, 'adquirido', sug.titulo_sugerido));
        });
    }

    function openFeedbackModal(suggestionId, newStatus, bookTitle) {
        if (!feedbackModal || !feedbackSuggestionIdInput || !feedbackNewStatusInput || !formFeedback) return;
        formFeedback.reset();
        feedbackSuggestionIdInput.value = suggestionId;
        feedbackNewStatusInput.value = newStatus;
        if(feedbackModalTitle) feedbackModalTitle.textContent = `Feedback para Sugestão: "${bookTitle}" (Novo Status: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)})`;
        feedbackModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    function closeFeedbackModal() {
        if(feedbackModal) feedbackModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    async function handleUpdateSuggestionStatus(event) {
        event.preventDefault();
        if(!formFeedback || !feedbackSuggestionIdInput || !feedbackNewStatusInput || !adminFeedbackTextInput) return;

        const suggestionId = feedbackSuggestionIdInput.value;
        const newStatus = feedbackNewStatusInput.value;
        const adminFeedback = adminFeedbackTextInput.value.trim();

        const btn = formFeedback.querySelector('button[type="submit"]');
        const originalBtnHTML = btn.innerHTML;
        btn.innerHTML = `Atualizando...`; btn.disabled = true;

        try {
            const headers = {'Content-Type': 'application/json'};
            if(currentUser) { headers['X-User-Username'] = currentUser.username; headers['X-User-Role'] = currentUser.role; }

            const response = await fetch(`${backendUrl}/api/admin/sugestoes/${suggestionId}/status`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ status_sugestao: newStatus, admin_feedback: adminFeedback })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || `Erro HTTP ${response.status}`);
            
            showMessage(result.mensagem || "Status da sugestão atualizado!", "success");
            closeFeedbackModal();
            fetchAllSuggestions(); // Recarrega a lista
        } catch (error) {
            showMessage(`Erro ao atualizar status: ${error.message}`, "error");
        } finally {
            btn.innerHTML = originalBtnHTML; btn.disabled = false;
        }
    }
    
    // --- Listeners ---
    if(logoutButton) logoutButton.addEventListener('click', logout);
    if(searchInput) searchInput.addEventListener('input', applySuggestionFiltersAndRender);
    if(statusFilter) statusFilter.addEventListener('change', applySuggestionFiltersAndRender);

    if(closeFeedbackModalButton) closeFeedbackModalButton.addEventListener('click', closeFeedbackModal);
    if(feedbackModalOverlay) feedbackModalOverlay.addEventListener('click', closeFeedbackModal);
    if(cancelFeedbackButton) cancelFeedbackButton.addEventListener('click', closeFeedbackModal);
    if(formFeedback) formFeedback.addEventListener('submit', handleUpdateSuggestionStatus);

    // --- Inicialização ---
    const currentYearSpan = document.getElementById('currentYearManageSuggestions');
    if(currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    
    checkAdminLoginStatus();
});
