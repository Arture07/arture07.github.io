document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Totalmente Carregado. Iniciando script.js v22.1 (Paginação Cursor e Correções)...");

    // --- Declaração de Variáveis Globais e de Estado ---
    let currentUser = null;
    let currentView = 'all-books'; 
    let selectedBookForDetail = null; 
    let selectedBookForEdit = null;   
    let selectedLoanForClientModal = null; 
    let userWishlist = []; 
    let currentActionToConfirm = null; 
    let debounceTimer; 

    // Estado da Paginação de Livros com Cursor
    const limitLivros = 12; 
    let currentPageNumber = 1; 
    let bookPageCursors = [null];
    let hasNextBookPage = false;

    // --- Seleção de Elementos da UI ---
    const adminView = document.getElementById('admin-view');
    const clientView = document.getElementById('client-view');
    const filtersContainer = document.getElementById('filters-container'); 
    const listaLivrosContainer = document.getElementById('lista-livros-container');
    const myLoansContent = document.getElementById('my-loans-content'); 
    const loanHistoryContent = document.getElementById('loan-history-content'); 
    const wishlistContent = document.getElementById('wishlist-content'); 
    const suggestBookViewContent = document.getElementById('suggest-book-view-content');
    
    const formAdicionarLivro = document.getElementById('form-adicionar-livro');
    const messageContainer = document.getElementById('message-container');
    const searchInput = document.getElementById('search-input');
    const genreFilterSelect = document.getElementById('genre-filter'); 
    const loginPrompt = document.getElementById('login-prompt');
    const userGreeting = document.getElementById('user-greeting');
    const userAvatar = document.getElementById('user-avatar');
    const logoutButton = document.getElementById('logout-button');
    
    const openAddBookModalButton = document.getElementById('openAddBookModalButton');
    const manageLoansButton = document.getElementById('manageLoansButton');
    const manageUsersButton = document.getElementById('manageUsersButton');
    const viewReportsButton = document.getElementById('viewReportsButton');
    const manageSuggestionsButton = document.getElementById('manageSuggestionsButton');
    
    const addBookModal = document.getElementById('addBookModal');
    const closeAddBookModalButton = document.getElementById('closeAddBookModalButton'); 
    const addBookModalOverlay = addBookModal ? addBookModal.querySelector('.modal-overlay') : null;
    const fetchIsbnInfoButton = document.getElementById('fetch-isbn-info');
    const isbnInputModal = document.getElementById('isbn'); 
    const tituloInputModal = document.getElementById('titulo');
    const autorInputModal = document.getElementById('autor');
    const anoPublicacaoInputModal = document.getElementById('ano_publicacao');
    const addCapaUrlInputModal = document.getElementById('add_capa_url');
    const addGeneroInputModal = document.getElementById('add_genero');
    const addEditoraInputModal = document.getElementById('add_editora');
    const addNumeroExemplaresTotalInput = document.getElementById('numero_exemplares_total');
    const addNumeroExemplaresDisponiveisInput = document.getElementById('numero_exemplares_disponiveis');
    const addCapaFileInput = document.getElementById('add_capa_file');

    const bookDetailLendModal = document.getElementById('bookDetailLendModal');
    const detailModalTitle = document.getElementById('detailModalTitle');
    const detailModalCover = document.getElementById('detailModalCover');
    const detailModalISBN = document.getElementById('detailModalISBN');
    const detailModalAutor = document.getElementById('detailModalAutor');
    const detailModalGenero = document.getElementById('detailModalGenero');
    const detailModalEditora = document.getElementById('detailModalEditora');
    const detailModalAno = document.getElementById('detailModalAno');
    const adminOnlyTotalExemplares = document.getElementById('adminOnlyTotalExemplares');
    const detailModalTotalExemplares = document.getElementById('detailModalTotalExemplares');
    const detailModalDisponiveisExemplares = document.getElementById('detailModalDisponiveisExemplares');
    const detailModalDataCadastro = document.getElementById('detailModalDataCadastro');
    const lendBookSection = document.getElementById('lendBookSection');
    const lendBookSectionTitle = document.getElementById('lendBookSectionTitle');
    const formEmprestarLivro = document.getElementById('form-emprestar-livro');
    const lendBookIdInput = document.getElementById('lendBookId');
    const leitorNomeInput = document.getElementById('leitorNome'); 
    const dataDevolucaoInput = document.getElementById('dataDevolucao');
    const submitLendButton = document.getElementById('submitLendButton'); 
    const closeBookDetailModalXButton = document.getElementById('closeBookDetailModalXButton'); 
    const closeBookDetailModalFooterButton = document.getElementById('closeBookDetailModalFooterButton'); 
    const cancelLendButton = document.getElementById('cancelLendButton');
    const detailModalOverlay = bookDetailLendModal ? bookDetailLendModal.querySelector('.modal-overlay-detail') : null;
    
    const clientLoanDetailModal = document.getElementById('clientLoanDetailModal'); 
    const clientLoanDetailModalTitle = document.getElementById('clientLoanDetailModalTitle');
    const clientLoanDetailModalCover = document.getElementById('clientLoanDetailModalCover');
    const clientLoanDetailModalBookTitle = document.getElementById('clientLoanDetailModalBookTitle'); 
    const clientLoanDetailModalAutor = document.getElementById('clientLoanDetailModalAutor');
    const clientLoanDetailModalISBN = document.getElementById('clientLoanDetailModalISBN');
    const clientLoanDetailModalLeitor = document.getElementById('clientLoanDetailModalLeitor');
    const clientLoanDetailDataEmprestimo = document.getElementById('clientLoanDetailDataEmprestimo');
    const clientLoanDetailDataDevolucaoPrevista = document.getElementById('clientLoanDetailDataDevolucaoPrevista');
    const clientLoanDetailStatus = document.getElementById('clientLoanDetailStatus');
    const clientLoanFineInfoSection = document.getElementById('clientLoanFineInfoSection');
    const clientLoanDetailDiasAtraso = document.getElementById('clientLoanDetailDiasAtraso');
    const clientLoanDetailMultaValor = document.getElementById('clientLoanDetailMultaValor');
    const clientLoanDetailMultaStatus = document.getElementById('clientLoanDetailMultaStatus');
    const closeClientLoanDetailModalButton = document.getElementById('closeClientLoanDetailModalButton');
    const closeClientLoanDetailModalFooterButton = document.getElementById('closeClientLoanDetailModalFooterButton');
    const clientLoanDetailModalOverlay = clientLoanDetailModal ? clientLoanDetailModal.querySelector('.modal-backdrop') : null;

    const tabAllBooks = document.getElementById('tab-all-books');
    const tabMyLoans = document.getElementById('tab-my-loans');
    const tabLoanHistory = document.getElementById('tab-loan-history'); 
    const tabWishlist = document.getElementById('tab-wishlist'); 
    const tabSuggestBook = document.getElementById('tab-suggest-book');

    const reviewsSection = document.getElementById('reviewsSection');
    const existingReviewsContainer = document.getElementById('existingReviewsContainer');
    const formAddReview = document.getElementById('form-add-review');
    const reviewRatingValueInput = document.getElementById('reviewRatingValue'); 
    const starRatingInputContainer = document.getElementById('star-rating-input'); 
    const reviewCommentText = document.getElementById('reviewCommentText');
    const submitReviewButton = document.getElementById('submitReviewButton');

    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationModalTitle = document.getElementById('confirmationModalTitle');
    const confirmationModalMessage = document.getElementById('confirmationModalMessage');
    const confirmModalConfirmButton = document.getElementById('confirmModalConfirmButton');
    const confirmModalCancelButton = document.getElementById('confirmModalCancelButton');
    const confirmModalOverlay = confirmationModal ? confirmationModal.querySelector('.modal-overlay-confirm') : null;

    const editBookModal = document.getElementById('editBookModal'); 
    const formEditarLivro = document.getElementById('form-editar-livro'); 
    const closeEditBookModalButton = document.getElementById('closeEditBookModalButton'); 
    const editBookModalOverlay = editBookModal ? editBookModal.querySelector('.modal-overlay-edit') : null; 
    const editIsbnInput = document.getElementById('edit_isbn');
    const editTituloInput = document.getElementById('edit_titulo');
    const editAutorInput = document.getElementById('edit_autor');
    const editAnoPublicacaoInput = document.getElementById('edit_ano_publicacao');
    const editGeneroInput = document.getElementById('edit_genero');
    const editEditoraInput = document.getElementById('edit_editora');
    const editCapaUrlInput = document.getElementById('edit_capa_url');
    const editNumeroExemplaresTotalInput = document.getElementById('edit_numero_exemplares_total');
    const editBookIdInput = document.getElementById('edit_book_id'); 
    const editCapaFile = document.getElementById('edit_capa_file');

    const openSuggestBookModalButtonOnView = document.getElementById('openSuggestBookModalButton'); 
    const mySuggestionsList = document.getElementById('my-suggestions-list');
    const suggestBookModal = document.getElementById('suggestBookModal');
    const closeSuggestBookModalButton = document.getElementById('closeSuggestBookModalButton');
    const suggestBookModalOverlay = suggestBookModal ? suggestBookModal.querySelector('.modal-overlay') : null;
    const formSuggestBook = document.getElementById('form-suggest-book');
    const submitSuggestionButton = document.getElementById('submitSuggestionButton');

    // Seletores para Paginação de Livros
    const bookPaginationControls = document.getElementById('book-pagination-controls');
    const prevPageButton = document.getElementById('prev-page-button');
    const nextPageButton = document.getElementById('next-page-button');
    const pageInfoSpan = document.getElementById('page-info');

    const backendUrl = 'https://shelfwise-backend-698679522199.southamerica-east1.run.app';

    if(document.getElementById('currentYear')) {
        document.getElementById('currentYear').textContent = new Date().getFullYear();
    }

    // --- FUNÇÕES AUXILIARES ---
    function showMessage(message, type = 'info') {
        const messageId = 'toast-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `feedback-message feedback-${type}`;
        messageDiv.textContent = message;
        if (messageContainer) { messageContainer.appendChild(messageDiv); } 
        else { console.warn("Message container não encontrado para toast."); alert(message); return; }
        requestAnimationFrame(() => { messageDiv.classList.add('show'); });
        setTimeout(() => {
            messageDiv.classList.add('fade-out');
            messageDiv.addEventListener('transitionend', () => {
                if (messageContainer && messageContainer.contains(messageDiv)) {
                    messageContainer.removeChild(messageDiv);
                }
            });
        }, 4500);
    }
    function addDays(date, days) {
        const result = new Date(date); // Cria cópia para não modificar a original
        result.setDate(result.getDate() + days);
        return result;
    }
    
    function isBefore(date1, date2) { // Compara apenas a parte da data
        const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
        return d1.getTime() < d2.getTime();
    }
    
    function isSameDay(date1, date2) { // Compara apenas a parte da data
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
    
    function getLoanStatus(emprestimo) {
        if (!emprestimo) {
            return { text: 'Dados Inválidos', colorClass: 'bg-gray-200 text-gray-800', order: 99 };
        }
        if (emprestimo.status === 'devolvido') {
            return { text: 'Devolvido', colorClass: 'bg-blue-100 text-blue-800', order: 3 };
        }
    
        const dataDevolucaoPrevistaStr = emprestimo.data_devolucao_prevista;
        if (!dataDevolucaoPrevistaStr) {
            // console.warn("getLoanStatus: data_devolucao_prevista ausente.", emprestimo);
            return { text: 'Data Prev. Inválida', colorClass: 'bg-gray-200 text-gray-800', order: 4 };
        }
    
        try {
            const dataDevPrev = new Date(dataDevolucaoPrevistaStr);
            
            if (isNaN(dataDevPrev.getTime())) {
                return { text: 'Data Prev. Inválida', colorClass: 'bg-gray-200 text-gray-800', order: 4 };
            }
    
            const hoje = new Date(); 
            
            const hojeNormalizada = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            const dataDevolucaoNormalizada = new Date(dataDevPrev.getFullYear(), dataDevPrev.getMonth(), dataDevPrev.getDate());
    
            if (dataDevolucaoNormalizada < hojeNormalizada) { 
                return { text: 'Atrasado', colorClass: 'bg-red-100 text-red-800', order: 0 };
            }
            
            const threeDaysFromNow = addDays(hojeNormalizada, 3); 
            if (dataDevolucaoNormalizada <= threeDaysFromNow) { // Inclui o dia exato
                return { text: 'Devolver em Breve', colorClass: 'bg-orange-100 text-orange-800', order: 1 };
            }
            return { text: 'Emprestado', colorClass: 'bg-yellow-100 text-yellow-800', order: 2 };
    
        } catch (e) {
            console.error("Erro ao processar data em getLoanStatus:", e, "String da data:", dataDevolucaoPrevistaStr);
            return { text: 'Erro na Data', colorClass: 'bg-red-200 text-red-700 font-bold', order: 5 };
        }
    }

    function renderStars(nota, container, isInput = false) {
        if (!container) return; 
        container.innerHTML = ''; 
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.classList.add('star');
            star.textContent = '★'; 
            star.dataset.value = i;
            if (i <= nota) {
                star.classList.add('selected');
            }
            if (isInput) {
                star.style.cursor = 'pointer'; 
                star.addEventListener('mouseover', function() {
                    const parent = this.parentNode;
                    const starsInParent = parent.querySelectorAll('.star');
                    const hoverValue = parseInt(this.dataset.value);
                    starsInParent.forEach(s => {
                        s.classList.toggle('selected', parseInt(s.dataset.value) <= hoverValue);
                    });
                });
                star.addEventListener('mouseout', function() {
                    const parent = this.parentNode;
                    const starsInParent = parent.querySelectorAll('.star');
                    const selectedRating = reviewRatingValueInput ? (parseInt(reviewRatingValueInput.value) || 0) : 0;
                    starsInParent.forEach(s => {
                        s.classList.toggle('selected', parseInt(s.dataset.value) <= selectedRating);
                    });
                });
                star.addEventListener('click', function() {
                    const value = this.dataset.value;
                    if(reviewRatingValueInput) reviewRatingValueInput.value = value; 
                    const parent = this.parentNode;
                    const starsInParent = parent.querySelectorAll('.star');
                    starsInParent.forEach(s => {
                        s.classList.toggle('selected', parseInt(s.dataset.value) <= parseInt(value));
                    });
                });
            } else { 
                 if (i > nota) star.classList.add('empty'); 
            }
            container.appendChild(star);
        }
    }
    
    function resetStarRating() {
        if (starRatingInputContainer) {
            const stars = starRatingInputContainer.querySelectorAll('.star');
            stars.forEach(star => star.classList.remove('selected'));
        }
        if (reviewRatingValueInput) reviewRatingValueInput.value = ''; 
    }

    async function fetchAndRenderReviews(livroId) {
        if (!existingReviewsContainer) {
            console.error("Elemento 'existingReviewsContainer' não encontrado no DOM para fetchAndRenderReviews.");
            return;
        }
        if (!livroId) {
            existingReviewsContainer.innerHTML = '<p class="text-sm text-gray-500 italic no-reviews-message">Não foi possível carregar avaliações (ID do livro ausente).</p>';
            return;
        }
        existingReviewsContainer.innerHTML = '<p class="text-sm text-gray-500 italic">Carregando avaliações...</p>';
        try {
            const response = await fetch(`${backendUrl}/api/livros/${livroId}/avaliacoes`);
            if (!response.ok) {
                if (response.status === 404) { 
                     existingReviewsContainer.innerHTML = '<p class="text-sm text-gray-500 italic no-reviews-message">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>';
                     return;
                }
                const errorData = await response.json().catch(() => ({erro: "Erro desconhecido ao buscar avaliações."})); 
                throw new Error(errorData.erro || `Erro HTTP ${response.status} ao buscar avaliações.`);
            }
            const avaliacoes = await response.json();
            existingReviewsContainer.innerHTML = ''; 

            if (avaliacoes.length === 0) {
                existingReviewsContainer.innerHTML = '<p class="text-sm text-gray-500 italic no-reviews-message">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>';
                return;
            }

            avaliacoes.forEach(review => {
                const reviewDiv = document.createElement('div');
                reviewDiv.className = 'p-3 bg-gray-50 rounded-md border border-gray-200 mb-3';
                const headerDiv = document.createElement('div');
                headerDiv.className = 'flex justify-between items-center mb-1';
                const userSpan = document.createElement('span');
                userSpan.className = 'text-sm font-semibold text-sky-700';
                userSpan.textContent = review.cliente_username || 'Anônimo';
                const dateSpan = document.createElement('span');
                dateSpan.className = 'text-xs text-gray-500';
                dateSpan.textContent = review.data_avaliacao ? new Date(review.data_avaliacao).toLocaleDateString('pt-BR') : '';
                headerDiv.appendChild(userSpan); headerDiv.appendChild(dateSpan);
                const ratingDiv = document.createElement('div');
                ratingDiv.className = 'star-rating-display mb-1 text-lg'; 
                renderStars(review.nota, ratingDiv, false); 
                const commentP = document.createElement('p');
                commentP.className = 'text-sm text-gray-700 whitespace-pre-wrap'; 
                commentP.textContent = review.comentario || '';
                reviewDiv.appendChild(headerDiv); reviewDiv.appendChild(ratingDiv);
                if (review.comentario) { reviewDiv.appendChild(commentP); }
                existingReviewsContainer.appendChild(reviewDiv);
            });
        } catch (error) {
            if(existingReviewsContainer) existingReviewsContainer.innerHTML = `<p class="text-sm text-red-500 italic">Não foi possível carregar as avaliações: ${error.message}</p>`;
        }
    }
    
    function openConfirmationModal(title, message, onConfirmCallback) {
        if (!confirmationModal || !confirmationModalTitle || !confirmationModalMessage || !confirmModalConfirmButton) {
            console.error("Elementos do modal de confirmação não encontrados. Usando window.confirm() como fallback.");
            if (window.confirm(message)) { 
                if (typeof onConfirmCallback === 'function') { onConfirmCallback(); }
            }
            return;
        }
        confirmationModalTitle.textContent = title;
        confirmationModalMessage.textContent = message;
        currentActionToConfirm = onConfirmCallback; 
        
        // Remove listener antigo para evitar múltiplos disparos e adiciona o novo
        const newBtn = confirmModalConfirmButton.cloneNode(true);
        confirmModalConfirmButton.parentNode.replaceChild(newBtn, confirmModalConfirmButton);
        // Atualiza a referência para o novo botão para que o listener seja adicionado a ele
        const newConfirmButton = document.getElementById('confirmModalConfirmButton');
        if(newConfirmButton) {
            newConfirmButton.addEventListener('click', () => {
                if (typeof currentActionToConfirm === 'function') { currentActionToConfirm(); }
                closeConfirmationModal();
            });
        }
        
        confirmationModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    function closeConfirmationModal() {
        if (confirmationModal) confirmationModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        currentActionToConfirm = null; 
    }
    
    async function proceedWithRenovacao(idEmprestimo, botaoRenovarEspecifico) {
        let originalButtonHTML = '';
        if (botaoRenovarEspecifico) {
            originalButtonHTML = botaoRenovarEspecifico.innerHTML;
            botaoRenovarEspecifico.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Renovando...`;
            botaoRenovarEspecifico.disabled = true;
        }
        try {
            const response = await fetch(`${backendUrl}/api/emprestimos/${idEmprestimo}/renovar`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ erro: "Erro ao processar a renovação." }));
                throw new Error(errData.erro || `Erro ${response.status} ao renovar empréstimo.`);
            }
            const data = await response.json();
            showMessage(data.mensagem || "Empréstimo renovado com sucesso!", "success");
            if (currentView === 'my-loans') carregarMeusEmprestimos(); 
        } catch (error) {
            showMessage(`Erro ao renovar empréstimo: ${error.message}`, "error");
        } finally {
            if (botaoRenovarEspecifico) {
                botaoRenovarEspecifico.innerHTML = originalButtonHTML;
                botaoRenovarEspecifico.disabled = false;
            }
        }
    }
    
    function handleRenovarEmprestimo(idEmprestimo, livroTitulo) {
        const botaoRenovarClicado = document.querySelector(`.renew-loan-btn[data-emprestimo-id="${idEmprestimo}"]`);
        openConfirmationModal(
            "Confirmar Renovação",
            `Tem certeza que deseja renovar o empréstimo do livro "${livroTitulo}" por mais 7 dias?`,
            () => proceedWithRenovacao(idEmprestimo, botaoRenovarClicado) 
        );
    }
    
    // --- Lógica de UI e Autenticação ---
    function setupUIForUser(user) {
        currentUser = user;
        if(userGreeting) userGreeting.textContent = `Olá, ${user.nome || user.username}`;
        if(userAvatar) {
            const nameForAvatar = user.nome || user.username;
            userAvatar.textContent = nameForAvatar.substring(0, 2).toUpperCase();
            userAvatar.classList.remove('hidden');
        }
        if(logoutButton) logoutButton.classList.remove('hidden');
        if(loginPrompt) loginPrompt.classList.add('hidden');
        
        let isAdminPanelVisible = false;
        if (adminView && openAddBookModalButton && manageLoansButton && manageUsersButton && viewReportsButton && manageSuggestionsButton) {
            const userRole = user.role;
            const canAddBooks = ['admin', 'catalogador'].includes(userRole);
            openAddBookModalButton.classList.toggle('hidden', !canAddBooks);
            if (canAddBooks) isAdminPanelVisible = true;

            const canManageLoans = ['admin', 'atendente'].includes(userRole);
            manageLoansButton.classList.toggle('hidden', !canManageLoans);
            if (canManageLoans) isAdminPanelVisible = true;
            
            const canManageUsers = userRole === 'admin';
            manageUsersButton.classList.toggle('hidden', !canManageUsers);
            if (canManageUsers) isAdminPanelVisible = true;

            const canViewReports = ['admin', 'analista'].includes(userRole);
            viewReportsButton.classList.toggle('hidden', !canViewReports);
            if (canViewReports) isAdminPanelVisible = true;

            const canManageSuggestions = userRole === 'admin';
            manageSuggestionsButton.classList.toggle('hidden', !canManageSuggestions);
            if (canManageSuggestions) isAdminPanelVisible = true;
            
            adminView.classList.toggle('hidden', !isAdminPanelVisible);
        } else {
            if(adminView) adminView.classList.add('hidden');
        }
        
        if (user.role === 'cliente') {
            if(clientView) clientView.classList.remove('hidden');
            if(adminView) adminView.classList.add('hidden'); 
            setupClientTabs();
            fetchUserWishlist(); 
            switchClientView('all-books', true); // true para resetar paginação
        } else { 
            if(clientView) clientView.classList.add('hidden');
            if (adminView && !adminView.classList.contains('hidden')) { // Se for funcionário e o painel admin estiver visível
                 carregarEListarLivros(true); // Carrega livros com paginação
            }
        }

        if(filtersContainer) {
            filtersContainer.classList.toggle('hidden', !(isAdminPanelVisible || (user.role === 'cliente' && currentView === 'all-books')));
        }
        popularFiltroGeneros(); 
    }

    function showLoginPrompt() { 
        if(adminView) adminView.classList.add('hidden'); 
        if(clientView) clientView.classList.add('hidden');
        if(filtersContainer) filtersContainer.classList.add('hidden'); 
        if(listaLivrosContainer) listaLivrosContainer.innerHTML = '';
        if(myLoansContent) myLoansContent.classList.add('hidden'); 
        if(loanHistoryContent) loanHistoryContent.classList.add('hidden');
        if(wishlistContent) wishlistContent.classList.add('hidden');
        if(loginPrompt) loginPrompt.classList.remove('hidden');
        if(userGreeting) userGreeting.textContent = ''; 
        if(userAvatar) userAvatar.classList.add('hidden');
        if(logoutButton) logoutButton.classList.add('hidden'); 
        currentUser = null;
    }

    function checkLoginStatus() { 
        const loggedInUser = localStorage.getItem('loggedInUser');
        if (loggedInUser) {
            try {
                const user = JSON.parse(loggedInUser);
                if (user && user.username && user.role) setupUIForUser(user);
                else throw new Error("Dados do usuário inválidos.");
            } catch (e) {
                console.error("Erro ao processar dados do usuário:", e);
                localStorage.removeItem('loggedInUser'); showLoginPrompt();
            }
        } else showLoginPrompt();
    }

    function logout() { 
        localStorage.removeItem('loggedInUser'); 
        userWishlist = []; 
        checkLoginStatus();
        showMessage('Você saiu da sua conta.', 'info');
    }
    
    function setupClientTabs() { 
        if (tabAllBooks) tabAllBooks.addEventListener('click', () => switchClientView('all-books'));
        if (tabMyLoans) tabMyLoans.addEventListener('click', () => switchClientView('my-loans'));
        if (tabLoanHistory) tabLoanHistory.addEventListener('click', () => switchClientView('loan-history')); 
        if (tabWishlist) tabWishlist.addEventListener('click', () => switchClientView('wishlist')); 
        if (tabSuggestBook) tabSuggestBook.addEventListener('click', () => switchClientView('suggest-book-view'));
    }

    function setActiveTab(activeTabId) { 
        [tabAllBooks, tabMyLoans, tabLoanHistory, tabWishlist, tabSuggestBook].forEach(tab => {
            if (tab) { 
                if (tab.id === activeTabId) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            }
        });
    }

    function resetPaginationState() {
        console.log("DEBUG: resetPaginationState chamada");
        currentPageLivros = 1;
        bookPageCursors = [null]; // O primeiro cursor é sempre null para a primeira página
        hasNextBookPage = false;  // Reseta o indicador de próxima página
        if (nextPageButton) nextPageButton.disabled = true; // Desabilita inicialmente
        if (prevPageButton) prevPageButton.disabled = true; // Desabilita inicialmente
        if (bookPaginationControls) bookPaginationControls.classList.add('hidden');
        if (pageInfoSpan) pageInfoSpan.textContent = '';
    }
    
    function switchClientView(view, forceBookListReset = false) { 
        console.log("DEBUG: switchClientView para:", view, "Resetar Paginação:", forceBookListReset);
        currentView = view;
        if(listaLivrosContainer) listaLivrosContainer.classList.add('hidden');
        if(myLoansContent) myLoansContent.classList.add('hidden');
        if(loanHistoryContent) loanHistoryContent.classList.add('hidden');
        if(wishlistContent) wishlistContent.classList.add('hidden'); 
        if(suggestBookViewContent) suggestBookViewContent.classList.add('hidden');

        const isAdminPanelCurrentlyVisible = adminView && !adminView.classList.contains('hidden');
        if (filtersContainer) {
            filtersContainer.classList.toggle('hidden', !(view === 'all-books' || isAdminPanelCurrentlyVisible));
        }

        let activeTabElementId = '';
        if (view === 'all-books') {
            activeTabElementId = 'tab-all-books';
            if(listaLivrosContainer) listaLivrosContainer.classList.remove('hidden');
            if (forceBookListReset) resetPaginationState();
            carregarEListarLivros();
        } else if (view === 'my-loans') {
            activeTabElementId = 'tab-my-loans';
            if(myLoansContent) myLoansContent.classList.remove('hidden');
            carregarMeusEmprestimos();
        } else if (view === 'loan-history') { 
            activeTabElementId = 'tab-loan-history';
            if(loanHistoryContent) loanHistoryContent.classList.remove('hidden');
            carregarHistoricoEmprestimos();
        } else if (view === 'wishlist') { 
            activeTabElementId = 'tab-wishlist';
            if(wishlistContent) { wishlistContent.classList.remove('hidden'); wishlistContent.innerHTML = '';  }
            carregarListaDesejos();
        } else if (view === 'suggest-book-view') { 
            activeTabElementId = 'tab-suggest-book';
            if(suggestBookViewContent) suggestBookViewContent.classList.remove('hidden');
            if(filtersContainer) filtersContainer.classList.add('hidden'); 
            fetchMySuggestions(); 
        }
        setActiveTab(activeTabElementId);
    }
    
    function openAddBookModalHandler() { 
        if (!currentUser || !['admin', 'catalogador'].includes(currentUser.role)) {
            showMessage("Você não tem permissão para adicionar livros.", "error");
            return;
        }
        if (addBookModal) addBookModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden'); 
    }
    function closeAddBookModalHandler() { 
        if (addBookModal) addBookModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        if (formAdicionarLivro) formAdicionarLivro.reset(); 
    }
    
    function openBookDetailModal(livro) { 
        selectedBookForDetail = livro; 
        if (!selectedBookForDetail || !selectedBookForDetail.id) {
            showMessage("Erro ao carregar detalhes do livro.", "error"); return;
        }
        if(detailModalTitle) detailModalTitle.textContent = livro.titulo || "Detalhes do Livro";
        if (lendBookSection && leitorNomeInput) {
            if (currentUser && currentUser.role === 'cliente' && livro.numero_exemplares_disponiveis > 0) {
                lendBookSection.classList.remove('hidden');
                if(lendBookSectionTitle) lendBookSectionTitle.textContent = "Confirmar Empréstimo";
                leitorNomeInput.value = currentUser.nome || currentUser.username;
                leitorNomeInput.readOnly = true; 
                leitorNomeInput.classList.add('bg-gray-100'); 
            } else if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'atendente') && livro.numero_exemplares_disponiveis > 0) {
                lendBookSection.classList.remove('hidden');
                if(lendBookSectionTitle) lendBookSectionTitle.textContent = "Emprestar Livro";
                leitorNomeInput.value = '';
                leitorNomeInput.readOnly = false; 
                leitorNomeInput.classList.remove('bg-gray-100'); 
            } else {
                lendBookSection.classList.add('hidden');
            }
        }
        if(detailModalCover) {
            detailModalCover.src = livro.capa_url || `https://placehold.co/300x450/e2e8f0/64748b?text=${encodeURIComponent(livro.titulo || 'Capa')}`;
            detailModalCover.alt = `Capa de ${livro.titulo || 'livro desconhecido'}`;
        }
        if(detailModalISBN) detailModalISBN.textContent = livro.isbn || 'N/A';
        if(detailModalAutor) detailModalAutor.textContent = livro.autor || 'N/A';
        if(detailModalGenero) detailModalGenero.textContent = livro.genero || 'N/A';
        if(detailModalEditora) detailModalEditora.textContent = livro.editora || 'N/A';
        if(detailModalAno) detailModalAno.textContent = livro.ano_publicacao || 'N/A';
        if(detailModalDisponiveisExemplares) detailModalDisponiveisExemplares.textContent = livro.numero_exemplares_disponiveis !== undefined ? livro.numero_exemplares_disponiveis : 'N/A';
        let dataCadastroFormatada = 'N/A';
        if (livro.data_cadastro) { try { dataCadastroFormatada = new Date(livro.data_cadastro).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) {} }
        if(detailModalDataCadastro) detailModalDataCadastro.textContent = dataCadastroFormatada;

        const podeEmprestar = currentUser && (currentUser.role === 'admin' || currentUser.role === 'atendente' || currentUser.role === 'cliente');
        const isFuncionarioComPermissaoEmprestimo = currentUser && (currentUser.role === 'admin' || currentUser.role === 'atendente');

        if (isFuncionarioComPermissaoEmprestimo) {
            if(adminOnlyTotalExemplares) adminOnlyTotalExemplares.classList.remove('hidden'); 
            if(detailModalTotalExemplares) detailModalTotalExemplares.textContent = livro.numero_exemplares_total !== undefined ? livro.numero_exemplares_total : 'N/A';
            if (livro.numero_exemplares_disponiveis > 0) {
                if(lendBookSection) lendBookSection.classList.remove('hidden');
                if(lendBookSectionTitle) lendBookSectionTitle.textContent = "Emprestar Livro";
                if(leitorNomeInput) { leitorNomeInput.value = ''; leitorNomeInput.readOnly = false; leitorNomeInput.classList.remove('bg-gray-100'); }
            } else { if(lendBookSection) lendBookSection.classList.add('hidden');  }
            if(lendBookIdInput) lendBookIdInput.value = livro.id;
        } else if (currentUser && currentUser.role === 'cliente' && livro.numero_exemplares_disponiveis > 0) {
            if(adminOnlyTotalExemplares) adminOnlyTotalExemplares.classList.add('hidden'); 
            if(lendBookSection) lendBookSection.classList.remove('hidden');
            if(lendBookSectionTitle) lendBookSectionTitle.textContent = "Confirmar Empréstimo";
            if(leitorNomeInput) { leitorNomeInput.value = currentUser.username; leitorNomeInput.readOnly = true; leitorNomeInput.classList.add('bg-gray-100'); }
            if(lendBookIdInput) lendBookIdInput.value = livro.id;
        } else { 
            if(adminOnlyTotalExemplares) adminOnlyTotalExemplares.classList.add('hidden');
            if(lendBookSection) lendBookSection.classList.add('hidden');
        }
        
        if(dataDevolucaoInput) {
            dataDevolucaoInput.value = ''; const today = new Date(); const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1); dataDevolucaoInput.min = tomorrow.toISOString().split("T")[0];
        }
        if (reviewsSection) { 
            fetchAndRenderReviews(livro.id); 
            if (currentUser && currentUser.role === 'cliente') { if(formAddReview) formAddReview.classList.remove('hidden'); resetStarRating();  } 
            else { if(formAddReview) formAddReview.classList.add('hidden'); }
        }
        if(bookDetailLendModal) bookDetailLendModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    function closeBookDetailModal() { 
        if(bookDetailLendModal) bookDetailLendModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        selectedBookForDetail = null;
        if(formEmprestarLivro) formEmprestarLivro.reset();
        if(formAddReview) formAddReview.reset(); 
        if(existingReviewsContainer) existingReviewsContainer.innerHTML = ''; 
        resetStarRating(); 
    }
    
    function renderizarLivros(targetContainer, livrosParaRenderizar) { 
        if(!targetContainer) { return; }
        targetContainer.innerHTML = ''; 
        const termoBuscaAtual = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const generoSelecionadoAtual = genreFilterSelect ? genreFilterSelect.value.toLowerCase() : "";

        if (livrosParaRenderizar.length === 0) { 
            let mensagemVazio = '';
            if (currentView !== 'wishlist') { 
                if (termoBuscaAtual || generoSelecionadoAtual) {
                    mensagemVazio = `<div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-gray-500">Nenhum livro encontrado com os filtros atuais.</div>`;
                } else {
                    mensagemVazio = `<div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-gray-500">Nenhum livro cadastrado ainda.`;
                    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'catalogador')) {
                         mensagemVazio += `<button id="openModalFromEmpty" class="mt-4 block mx-auto text-sky-600 hover:text-sky-700 font-semibold">Adicionar Livro</button>`;
                    }
                    mensagemVazio += `</div>`;
                }
                 targetContainer.innerHTML = mensagemVazio; 
            }
            if (targetContainer === listaLivrosContainer && currentUser && (currentUser.role === 'admin' || currentUser.role === 'catalogador') && !termoBuscaAtual && !generoSelecionadoAtual && currentView === 'all-books') {
                const btn = document.getElementById('openModalFromEmpty');
                if(btn && openAddBookModalButton) btn.addEventListener('click', openAddBookModalHandler);
            }
            return;
        }

        livrosParaRenderizar.forEach(livro => {
            const livroCard = document.createElement('div');
            livroCard.className = 'bg-white rounded-lg shadow-lg overflow-hidden flex flex-col transform hover:scale-105 transition-transform duration-300'; 
            const cardContent = document.createElement('div'); 
            cardContent.className = 'flex-grow flex flex-col book-card-clickable'; 
            cardContent.addEventListener('click', (e) => {
                if (e.target.closest('.edit-book-btn') || e.target.closest('.delete-book-btn')) {
                    return;
                }
                openBookDetailModal(livro);
            }); 
            
            const placeholderText = livro.titulo ? encodeURIComponent(livro.titulo.substring(0,15)) : 'Capa';
            const placeholderCapa = `https://placehold.co/300x450/e2e8f0/64748b?text=${placeholderText}`;
            let imagemHTML = `<div class="w-full h-64 md:h-72 book-cover-placeholder"><span>${livro.titulo || 'Capa'}</span></div>`;
            if (livro.capa_url) imagemHTML = `<img src="${livro.capa_url}" alt="Capa de ${livro.titulo || ''}" class="w-full h-64 md:h-72 object-cover" onerror="this.onerror=null; this.src='${placeholderCapa}';">`;
            else imagemHTML = `<img src="${placeholderCapa}" alt="Capa de ${livro.titulo || ''}" class="w-full h-64 md:h-72 object-cover">`;

            let disponibilidadeHTML = '';
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'catalogador' || currentUser.role === 'atendente')) {
                disponibilidadeHTML = `<div class="mt-2 pt-2 border-t border-gray-200"><p><strong>Total:</strong> ${livro.numero_exemplares_total !== undefined ? livro.numero_exemplares_total : 'N/A'}</p><p><strong>Disp.:</strong> ${livro.numero_exemplares_disponiveis !== undefined ? livro.numero_exemplares_disponiveis : 'N/A'}</p></div>`;
            } else { 
                disponibilidadeHTML = livro.numero_exemplares_disponiveis > 0 ? 
                    `<p class="mt-2 pt-2 border-t border-gray-200 text-green-600 font-semibold">Disponível para empréstimo</p>` : 
                    `<p class="mt-2 pt-2 border-t border-gray-200 text-red-600 font-semibold">Indisponível no momento</p>`;
            }
            
            let wishlistButtonHTML = '';
            if (currentUser && currentUser.role === 'cliente') {
                const isWishlisted = userWishlist.includes(livro.id);
                wishlistButtonHTML = `
                    <button 
                        class="wishlist-btn mt-3 w-full text-sm py-2 px-3 rounded-md transition-colors flex items-center justify-center 
                               ${isWishlisted ? 'bg-pink-500 hover:bg-pink-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}" 
                        data-livro-id="${livro.id}"
                        title="${isWishlisted ? 'Remover da Lista de Desejos' : 'Adicionar à Lista de Desejos'}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="${isWishlisted ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        ${isWishlisted ? 'Na Lista' : 'Desejo'}
                    </button>`;
            }

            const adminButtonsHTML = (currentUser && (currentUser.role === 'admin' || currentUser.role === 'catalogador')) ? `
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <button class="edit-book-btn text-xs text-yellow-600 hover:text-yellow-800 font-medium py-1 px-2 rounded-md bg-yellow-100 hover:bg-yellow-200 flex items-center" data-livro-id="${livro.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Editar
                    </button>
                    <button class="delete-book-btn text-xs text-red-600 hover:text-red-800 font-medium py-1 px-2 rounded-md bg-red-100 hover:bg-red-200 flex items-center" data-livro-id="${livro.id}" data-livro-titulo="${livro.titulo || 'este livro'}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Excluir
                    </button>
                </div>
            ` : '';
            
            const detalhesHTML = `
                <div class="p-5 flex flex-col flex-grow">
                    <h3 class="text-lg font-semibold text-sky-700 mb-1 truncate" title="${livro.titulo || ''}">${livro.titulo || 'N/A'}</h3>
                    <p class="text-sm text-gray-600 mb-2 truncate" title="${livro.autor || ''}"><strong>Autor:</strong> ${livro.autor || 'N/A'}</p>
                    <div class="text-xs text-gray-500 space-y-0.5 mt-auto">
                        <p><strong>ISBN:</strong> ${livro.isbn || 'N/A'}</p>
                        ${disponibilidadeHTML}
                        ${adminButtonsHTML} 
                    </div>
                </div>`;
            
            cardContent.innerHTML = `<div class="relative">${imagemHTML}</div>` + detalhesHTML;
            livroCard.appendChild(cardContent); 
            if (wishlistButtonHTML) { 
                const wishlistButtonContainer = document.createElement('div');
                wishlistButtonContainer.className = 'px-5 pb-4'; 
                wishlistButtonContainer.innerHTML = wishlistButtonHTML;
                livroCard.appendChild(wishlistButtonContainer);
            }
            targetContainer.appendChild(livroCard); 
        });

        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'catalogador')) {
            targetContainer.querySelectorAll('.edit-book-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    const livroId = e.currentTarget.dataset.livroId;
                    openEditBookModal(livroId);
                });
            });
            targetContainer.querySelectorAll('.delete-book-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const livroId = e.currentTarget.dataset.livroId;
                    const livroTitulo = e.currentTarget.dataset.livroTitulo;
                    handleDeleteBook(livroId, livroTitulo);
                });
            });
        }

        targetContainer.querySelectorAll('.wishlist-btn').forEach(button => {
            button.addEventListener('click', handleWishlistToggle);
        });
    }
            
    async function carregarEListarLivros() { 
        if (!currentUser) {
            if(listaLivrosContainer) listaLivrosContainer.innerHTML = ''; 
            if(bookPaginationControls) bookPaginationControls.classList.add('hidden');
            return;
        }
        if (! (currentView === 'all-books' || (currentUser && ['admin', 'catalogador', 'atendente', 'analista'].includes(currentUser.role))) ) {
            if(bookPaginationControls) bookPaginationControls.classList.add('hidden');
            return;
        }

        if(listaLivrosContainer) listaLivrosContainer.innerHTML = `<div class="col-span-full text-center p-8"><svg class="mx-auto h-12 w-12 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Carregando livros...</div>`;
        if(bookPaginationControls) bookPaginationControls.classList.add('hidden');
        
        const searchTerm = searchInput ? searchInput.value.trim() : "";
        const selectedGenre = genreFilterSelect ? genreFilterSelect.value : "";
        
        let apiUrl = `${backendUrl}/api/livros?limit=${limitLivros}`;
        if (searchTerm) apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
        if (selectedGenre) apiUrl += `&genre=${encodeURIComponent(selectedGenre)}`;
        
        // Usa o cursor para a página atual. Se for a primeira página, bookPageCursors[0] é null.
        const cursorParaPaginaAtual = bookPageCursors[currentPageNumber - 1];
        if (cursorParaPaginaAtual) {
            apiUrl += `&start_after_doc_id=${cursorParaPaginaAtual}`;
        }
        
        console.log("DEBUG: Chamando API de livros:", apiUrl);

        try {
            const response = await fetch(apiUrl);
            if (response.status === 401) { logout(); throw new Error("Não autorizado."); }
            if (!response.ok) {
                const errData = await response.json().catch(() => ({erro: "Erro ao buscar dados da API."}));
                throw new Error(errData.erro || `Erro HTTP ${response.status}`);
            }
            const data = await response.json();
            console.log("DEBUG: Resposta da API /api/livros:", data);

            if (data.livros && listaLivrosContainer) {
                renderizarLivros(listaLivrosContainer, data.livros);
            } else {
                 if(listaLivrosContainer) listaLivrosContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Nenhum livro encontrado.</p>';
            }

            if (data.pagination && bookPaginationControls && pageInfoSpan && prevPageButton && nextPageButton) {
                hasNextBookPage = data.pagination.has_next_page;
                if (hasNextBookPage && data.pagination.next_page_cursor) {
                    if (bookPageCursors.length === currentPageNumber) {
                        bookPageCursors.push(data.pagination.next_page_cursor);
                    } else {
                        bookPageCursors[currentPageNumber] = data.pagination.next_page_cursor;
                    }
                }
                renderizarControlesDePaginacaoLivros(data.pagination.has_next_page);
            } else if (bookPaginationControls) {
                bookPaginationControls.classList.add('hidden');
            }

        } catch (error) {
            console.error('Falha ao buscar livros:', error);
            if(listaLivrosContainer) listaLivrosContainer.innerHTML = `<div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-red-500">Erro ao carregar. Tente mais tarde.</div>`;
            if(bookPaginationControls) bookPaginationControls.classList.add('hidden');
            if (!error.message.includes("Não autorizado")) showMessage(`Falha ao buscar livros: ${error.message}`, 'error');
        }
    }

    function renderizarControlesDePaginacaoLivros(hasNext) {
        if (!pageInfoSpan || !prevPageButton || !nextPageButton || !bookPaginationControls) {
            console.warn("Elementos de paginação não encontrados no DOM para renderizarControlesDePaginacaoLivros.");
            if(bookPaginationControls) bookPaginationControls.classList.add('hidden');
            return;
        }

        if (currentPageNumber === 1 && !hasNext) { 
            bookPaginationControls.classList.add('hidden');
            return;
        }
        bookPaginationControls.classList.remove('hidden');
        
        pageInfoSpan.textContent = `Página ${currentPageNumber}`; 
        
        prevPageButton.disabled = currentPageLivros <= 1;
        nextPageButton.disabled = !hasNext; 
    }
    
    function mudarPaginaLivros(direcao) { 
        if (direcao === 'next' && nextPageButton && !nextPageButton.disabled) {
            currentPageNumber++;
            carregarEListarLivros();
        } else if (direcao === 'prev' && prevPageButton && !prevPageButton.disabled) {
            if (currentPageLivros > 1) {
                currentPageNumber--;
                carregarEListarLivros();
            }
        }
    }

    
    // --- Funções de Edição e Exclusão de Livros (Admin/Catalogador) ---
    function openEditBookModal(livroId) {
        if (!editBookModal) { console.error("Modal de edição não encontrado."); return; }
        if (!currentUser || !['admin', 'catalogador'].includes(currentUser.role)) {
            showMessage("Você não tem permissão para editar livros.", "error");
            return;
        }
        fetch(`${backendUrl}/api/livros/${livroId}`)
            .then(response => {
                if (!response.ok) throw new Error(`Erro ao buscar dados do livro: ${response.status}`);
                return response.json();
            })
            .then(livro => {
                selectedBookForEdit = livro; 
                if (editBookIdInput) editBookIdInput.value = livro.id;
                if (editTituloInput) editTituloInput.value = livro.titulo || '';
                if (editAutorInput) editAutorInput.value = livro.autor || '';
                if (editIsbnInput) editIsbnInput.value = livro.isbn || '';
                if (editAnoPublicacaoInput) editAnoPublicacaoInput.value = livro.ano_publicacao || '';
                if (editGeneroInput) editGeneroInput.value = livro.genero || '';
                if (editEditoraInput) editEditoraInput.value = livro.editora || '';
                if (editCapaUrlInput) editCapaUrlInput.value = livro.capa_url || '';
                if (editNumeroExemplaresTotalInput) editNumeroExemplaresTotalInput.value = livro.numero_exemplares_total || 1;
                if(editCapaFile) editCapaFile.value = ''; 
                editBookModal.classList.remove('hidden');
                document.body.classList.add('overflow-hidden');
            })
            .catch(error => {
                showMessage(`Erro ao carregar dados do livro para edição: ${error.message}`, 'error');
            });
    }

    function closeEditBookModal() {
        if (editBookModal) editBookModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        if (formEditarLivro) formEditarLivro.reset();
        selectedBookForEdit = null;
    }

    async function handleDeleteBook(livroId, livroTitulo) {
        if (!currentUser || !['admin', 'catalogador'].includes(currentUser.role)) {
            showMessage("Você não tem permissão para excluir livros.", "error");
            return;
        }
        openConfirmationModal(
            "Confirmar Exclusão",
            `Tem certeza que deseja excluir o livro "${livroTitulo}"? Esta ação não pode ser desfeita.`,
            async () => {
                try {
                    const headers = {};
                    if (currentUser) { headers['X-User-Username'] = currentUser.username; headers['X-User-Role'] = currentUser.role; }
                    const response = await fetch(`${backendUrl}/api/livros/${livroId}`, { method: 'DELETE', headers: headers });
                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({erro: "Erro ao excluir livro."}));
                        throw new Error(errData.erro || `Erro ${response.status} ao excluir livro.`);
                    }
                    const data = await response.json();
                    showMessage(data.mensagem || "Livro excluído com sucesso!", "success");
                    aplicarFiltrosErenderizar(); 
                } catch (error) {
                    showMessage(`Erro ao excluir livro: ${error.message}`, "error");
                }
            }
        );
    }
    
    async function carregarMeusEmprestimos() { 
        if (!currentUser || currentUser.role !== 'cliente') {
            if(myLoansContent) myLoansContent.innerHTML = '<p class="text-center text-gray-500">Apenas clientes podem ver seus empréstimos.</p>';
            return;
        }
        if(myLoansContent) myLoansContent.innerHTML = `<div class="col-span-full text-center p-8">Carregando...</div>`;
        try {
            const response = await fetch(`${backendUrl}/api/meus_emprestimos?username=${encodeURIComponent(currentUser.username)}`);
            if (response.status === 401) { logout(); throw new Error("Sessão expirada."); }
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.erro || `Erro ${response.status}`);
            }
            const emprestimos = await response.json();
            renderizarMeusEmprestimos(emprestimos);
        } catch (error) {
            showMessage(error.message, 'error');
            if(myLoansContent) myLoansContent.innerHTML = `<div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-red-500">Erro ao carregar.</div>`;
        }
    }

    function renderizarMeusEmprestimos(emprestimos) { 
        const myLoansContent = document.getElementById('my-loans-content');
        if(!myLoansContent) return;
    
        myLoansContent.innerHTML = ''; 
    
        if (!emprestimos || emprestimos.length === 0) {
            myLoansContent.innerHTML = `
                <div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-gray-500">
                    Você não tem livros emprestados.
                </div>`;
            return;
        }
    
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'; 
        
        emprestimos.forEach(emprestimo => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-lg overflow-hidden flex flex-col transform hover:scale-105 transition-transform duration-300 book-card-clickable';
    
            card.addEventListener('click', () => openMyLoanDetailModal(emprestimo)); 
    
            const placeholderText = emprestimo.livro_titulo 
                ? encodeURIComponent(emprestimo.livro_titulo.substring(0,15)) 
                : 'Capa';
    
            const placeholderCapa = `https://placehold.co/300x450/e2e8f0/64748b?text=${placeholderText}`;
            
            let imagemHTML = `<div class="book-cover-image book-cover-placeholder"><span>${emprestimo.livro_titulo || 'Capa'}</span></div>`; 
            if (emprestimo.livro_detalhes && emprestimo.livro_detalhes.capa_url) {
                imagemHTML = `<img src="${emprestimo.livro_detalhes.capa_url}" alt="Capa de ${emprestimo.livro_titulo || ''}" class="book-cover-image" onerror="this.onerror=null; this.src='${placeholderCapa}';">`;
            } else {
                imagemHTML = `<img src="${placeholderCapa}" alt="Capa de ${emprestimo.livro_titulo || ''}" class="book-cover-image">`;
            }
            
            const statusInfo = getLoanStatus(emprestimo);
            let dataDevolucaoF = 'N/A'; 
    
            if (emprestimo.data_devolucao_prevista) { 
                try { 
                    const dataDev = new Date(emprestimo.data_devolucao_prevista);
                    dataDevolucaoF = dataDev.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                } catch(e) { 
                    console.error("Erro ao formatar data de devolução para card:", e); 
                }
            }
    
            card.innerHTML = `
                <div class="relative">${imagemHTML}</div> 
                <div class="p-4 flex flex-col flex-grow"> 
                    <h3 class="text-md font-semibold text-sky-700 mb-1 truncate" title="${emprestimo.livro_titulo || ''}">
                        ${emprestimo.livro_titulo || 'Desconhecido'}
                    </h3> 
                    ${emprestimo.livro_detalhes?.autor 
                        ? `<p class="text-xs text-gray-500 mb-1 truncate">Por: ${emprestimo.livro_detalhes.autor}</p>` 
                        : ''} 
                    <div class="text-xs text-gray-600 mt-auto space-y-1"> 
                        <p><strong>Devolver até:</strong> ${dataDevolucaoF}</p> 
                        <p>
                            <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${statusInfo.colorClass}">
                                ${statusInfo.text}
                            </span>
                        </p> 
                    </div> 
                </div>`;
    
            if (
                emprestimo.status === 'emprestado' || 
                statusInfo.text === 'Atrasado' || 
                statusInfo.text === 'Devolver em Breve'
            ) { 
                const renewBtnContainer = document.createElement('div');
                renewBtnContainer.className = 'p-4 border-t border-gray-200 flex-shrink-0';
    
                const renewButton = document.createElement('button'); 
                renewButton.className = 'w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out flex items-center justify-center text-sm renew-loan-btn';
                
                renewButton.dataset.emprestimoId = emprestimo.id_emprestimo; 
                renewButton.dataset.livroTitulo = emprestimo.livro_titulo;   
                
                renewButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
                        viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                        class="w-4 h-4 mr-1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" 
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 
                            0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 
                            0013.803-3.7M4.031 9.865a8.25 8.25 0 
                            0113.803-3.7l3.181 3.183m0-4.993v4.992h-4.992"/>
                    </svg>
                    Renovar
                `;
    
                renewButton.addEventListener('click', (e) => { 
                    e.stopPropagation(); 
                    handleRenovarEmprestimo(
                        e.currentTarget.dataset.emprestimoId, 
                        e.currentTarget.dataset.livroTitulo
                    );
                });
    
                renewBtnContainer.appendChild(renewButton); 
                card.appendChild(renewBtnContainer);
            }
    
            gridContainer.appendChild(card);
        });
    
        myLoansContent.appendChild(gridContainer);
    }
        
       

    function openMyLoanDetailModal(emprestimo) {
        if (!clientLoanDetailModal || !emprestimo) {
            console.error("Modal de detalhes do empréstimo do cliente ou dados do empréstimo não encontrados.");
            return;
        }
        selectedLoanForClientModal = emprestimo;

        if(clientLoanDetailModalTitle) clientLoanDetailModalTitle.textContent = emprestimo.livro_titulo || "Detalhes do Empréstimo";
        if(clientLoanDetailModalCover) clientLoanDetailModalCover.src = emprestimo.livro_detalhes?.capa_url || `https://placehold.co/300x450/e2e8f0/64748b?text=Capa`;
        if(clientLoanDetailModalBookTitle) clientLoanDetailModalBookTitle.textContent = emprestimo.livro_titulo || "N/A";
        if(clientLoanDetailModalAutor) clientLoanDetailModalAutor.textContent = emprestimo.livro_detalhes?.autor || "N/A";
        if(clientLoanDetailModalISBN) clientLoanDetailModalISBN.textContent = emprestimo.livro_detalhes?.isbn || "N/A";
        
        // Exibe o nome do leitor (que é o próprio cliente)
        if(clientLoanDetailModalLeitor) clientLoanDetailModalLeitor.textContent = currentUser.nome || currentUser.username; // Usa o nome do currentUser
        
        if(clientLoanDetailDataEmprestimo) clientLoanDetailDataEmprestimo.textContent = emprestimo.data_emprestimo ? new Date(emprestimo.data_emprestimo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'N/A';
        if(clientLoanDetailDataDevolucaoPrevista) clientLoanDetailDataDevolucaoPrevista.textContent = emprestimo.data_devolucao_prevista ? new Date(emprestimo.data_devolucao_prevista).toLocaleDateString('pt-BR') : 'N/A';
        
        const statusInfo = getLoanStatus(emprestimo);
        if(clientLoanDetailStatus) {
            clientLoanDetailStatus.textContent = statusInfo.text;
            clientLoanDetailStatus.className = `font-semibold px-2 py-0.5 rounded-full text-xs ${statusInfo.colorClass}`; // Aplica a classe de cor
        }

        // Detalhes da Multa para Cliente
        if (clientLoanFineInfoSection && emprestimo.multa_status && emprestimo.multa_status !== 'nao_aplicavel') {
            clientLoanFineInfoSection.classList.remove('hidden');
            if(clientLoanDetailDiasAtraso) clientLoanDetailDiasAtraso.textContent = emprestimo.dias_atraso || 0;
            if(clientLoanDetailMultaValor) clientLoanDetailMultaValor.textContent = (emprestimo.multa_valor_calculado || 0).toFixed(2);
            if(clientLoanDetailMultaStatus) clientLoanDetailMultaStatus.textContent = emprestimo.multa_status.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase());
        } else {
            if(clientLoanFineInfoSection) clientLoanFineInfoSection.classList.add('hidden');
        }

        clientLoanDetailModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    function closeClientLoanDetailModal() {
        if (clientLoanDetailModal) clientLoanDetailModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        selectedLoanForClientModal = null;
    }

    function renderizarLivros(targetContainer, livrosParaRenderizar) {
        // Esta função será chamada por carregarEListarLivros com os livros da página atual
        if (!targetContainer) {
            console.error("renderizarLivros: targetContainer não definido.");
            return;
        }
        targetContainer.innerHTML = ''; 
    
        if (!livrosParaRenderizar || livrosParaRenderizar.length === 0) { 
            let mensagemVazio = '';
            if (currentView !== 'wishlist') { // Se não for a lista de desejos
                const termoBuscaAtual = searchInput ? searchInput.value.trim().toLowerCase() : "";
                const generoSelecionadoAtual = genreFilterSelect ? genreFilterSelect.value.toLowerCase() : "";
                if (termoBuscaAtual || generoSelecionadoAtual) {
                    mensagemVazio = `<div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-gray-500">Nenhum livro encontrado com os filtros atuais.</div>`;
                } else {
                    mensagemVazio = `<div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-gray-500">Nenhum livro cadastrado ainda.`;
                    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'catalogador')) {
                        mensagemVazio += `<button id="openModalFromEmpty" class="mt-4 block mx-auto text-sky-600 hover:text-sky-700 font-semibold">Adicionar Livro</button>`;
                    }
                    mensagemVazio += `</div>`;
                }
                targetContainer.innerHTML = mensagemVazio; 
            } else { // Para wishlist vazia
                targetContainer.className = 'col-span-full'; // Ajusta o container para ocupar toda a largura
                targetContainer.innerHTML = `<div class="bg-white p-8 rounded-lg shadow text-center text-gray-500">Sua lista de desejos está vazia.</div>`;
            }
            // Adiciona listener para o botão "Adicionar Livro" se ele for criado
            if (targetContainer === listaLivrosContainer && currentUser && 
                (currentUser.role === 'admin' || currentUser.role === 'catalogador') && 
                currentView === 'all-books' && 
                (!searchInput || !searchInput.value.trim()) && 
                (!genreFilterSelect || !genreFilterSelect.value) ) {
                const btn = document.getElementById('openModalFromEmpty');
                // openAddBookModalButton é o botão no painel admin, openAddBookModalHandler é a função que abre o modal
                if(btn && typeof openAddBookModalHandler === 'function') { // Verifica se openAddBookModalHandler está definida
                     btn.addEventListener('click', openAddBookModalHandler);
                }
            }
            return;
        }
    
        // Se chegou aqui, há livros para renderizar. Garante que o container tenha as classes de grid.
        if (targetContainer === listaLivrosContainer || targetContainer.id === 'wishlist-content') {
            targetContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
        }
    
    
        livrosParaRenderizar.forEach(livro => {
            const livroCard = document.createElement('div');
            livroCard.className = 'bg-white rounded-lg shadow-lg overflow-hidden flex flex-col transform hover:scale-105 transition-transform duration-300'; 
            
            const cardContent = document.createElement('div'); 
            cardContent.className = 'flex-grow flex flex-col book-card-clickable'; 
            
            // Adiciona listener para abrir detalhes do livro, exceto se clicar nos botões de admin
            cardContent.addEventListener('click', (e) => {
                if (e.target.closest('.edit-book-btn') || e.target.closest('.delete-book-btn')) {
                    return; // Não abre o modal de detalhes se o clique foi nos botões de admin
                }
                if (typeof openBookDetailModal === 'function') {
                    openBookDetailModal(livro);
                } else {
                    console.error("Função openBookDetailModal não definida.");
                }
            }); 
            
            const placeholderText = livro.titulo ? encodeURIComponent(livro.titulo.substring(0,15)) : 'Capa';
            const placeholderCapa = `https://placehold.co/300x450/e2e8f0/64748b?text=${placeholderText}`;
            // Usa a classe CSS .book-cover-image para padronizar altura e object-fit
            let imagemHTML = `<div class="book-cover-placeholder"><span>${livro.titulo || 'Capa'}</span></div>`;
            if (livro.capa_url) {
                imagemHTML = `<img src="${livro.capa_url}" alt="Capa de ${livro.titulo || ''}" class="book-cover-image" onerror="this.onerror=null; this.src='${placeholderCapa}';">`;
            } else {
                imagemHTML = `<img src="${placeholderCapa}" alt="Capa de ${livro.titulo || ''}" class="book-cover-image">`;
            }
    
            let disponibilidadeHTML = '';
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'catalogador' || currentUser.role === 'atendente')) {
                disponibilidadeHTML = `<div class="mt-2 pt-2 border-t border-gray-200"><p><strong>Total:</strong> ${livro.numero_exemplares_total !== undefined ? livro.numero_exemplares_total : 'N/A'}</p><p><strong>Disp.:</strong> ${livro.numero_exemplares_disponiveis !== undefined ? livro.numero_exemplares_disponiveis : 'N/A'}</p></div>`;
            } else { 
                disponibilidadeHTML = livro.numero_exemplares_disponiveis > 0 ? 
                    `<p class="mt-2 pt-2 border-t border-gray-200 text-green-600 font-semibold">Disponível para empréstimo</p>` : 
                    `<p class="mt-2 pt-2 border-t border-gray-200 text-red-600 font-semibold">Indisponível no momento</p>`;
            }
            
            let wishlistButtonHTML = '';
            if (currentUser && currentUser.role === 'cliente') {
                const isWishlisted = userWishlist.includes(livro.id);
                wishlistButtonHTML = `
                    <button 
                        class="wishlist-btn mt-3 w-full text-sm py-2 px-3 rounded-md transition-colors flex items-center justify-center 
                               ${isWishlisted ? 'bg-pink-500 hover:bg-pink-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}" 
                        data-livro-id="${livro.id}"
                        title="${isWishlisted ? 'Remover da Lista de Desejos' : 'Adicionar à Lista de Desejos'}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="${isWishlisted ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        ${isWishlisted ? 'Na Lista' : 'Desejo'}
                    </button>`;
            }
    
            // Botões de Admin/Catalogador
            const adminButtonsHTML = (currentUser && (currentUser.role === 'admin' || currentUser.role === 'catalogador')) ? `
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <button class="edit-book-btn text-xs text-yellow-600 hover:text-yellow-800 font-medium py-1 px-2 rounded-md bg-yellow-100 hover:bg-yellow-200 flex items-center" data-livro-id="${livro.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Editar
                    </button>
                    <button class="delete-book-btn text-xs text-red-600 hover:text-red-800 font-medium py-1 px-2 rounded-md bg-red-100 hover:bg-red-200 flex items-center" data-livro-id="${livro.id}" data-livro-titulo="${livro.titulo || 'este livro'}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Excluir
                    </button>
                </div>
            ` : '';
            
            const detalhesHTML = `
                <div class="p-5 flex flex-col flex-grow">
                    <h3 class="text-lg font-semibold text-sky-700 mb-1 truncate" title="${livro.titulo || ''}">${livro.titulo || 'N/A'}</h3>
                    <p class="text-sm text-gray-600 mb-2 truncate" title="${livro.autor || ''}"><strong>Autor:</strong> ${livro.autor || 'N/A'}</p>
                    <div class="text-xs text-gray-500 space-y-0.5 mt-auto">
                        <p><strong>ISBN:</strong> ${livro.isbn || 'N/A'}</p>
                        ${disponibilidadeHTML}
                        ${adminButtonsHTML} 
                    </div>
                </div>`;
            
            cardContent.innerHTML = `<div class="relative">${imagemHTML}</div>` + detalhesHTML;
            livroCard.appendChild(cardContent); 
            if (wishlistButtonHTML) { 
                const wishlistButtonContainer = document.createElement('div');
                wishlistButtonContainer.className = 'px-5 pb-4'; 
                wishlistButtonContainer.innerHTML = wishlistButtonHTML;
                livroCard.appendChild(wishlistButtonContainer);
            }
            targetContainer.appendChild(livroCard); 
        });
    
        // Adiciona listeners aos botões de admin (Editar/Excluir)
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'catalogador')) {
            targetContainer.querySelectorAll('.edit-book-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    const livroId = e.currentTarget.dataset.livroId;
                    if (typeof openEditBookModal === 'function') {
                        openEditBookModal(livroId);
                    } else {
                        console.error("Função openEditBookModal não definida.");
                    }
                });
            });
            targetContainer.querySelectorAll('.delete-book-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const livroId = e.currentTarget.dataset.livroId;
                    const livroTitulo = e.currentTarget.dataset.livroTitulo;
                    if (typeof handleDeleteBook === 'function') {
                        handleDeleteBook(livroId, livroTitulo);
                    } else {
                        console.error("Função handleDeleteBook não definida.");
                    }
                });
            });
        }
    
        // Adiciona listeners aos botões de wishlist
        targetContainer.querySelectorAll('.wishlist-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que o clique no botão de wishlist abra o modal de detalhes do livro
                if (typeof handleWishlistToggle === 'function') {
                    handleWishlistToggle(e);
                } else {
                    console.error("Função handleWishlistToggle não definida.");
                }
            });
        });
    }

    function openLoanDetailModal(emprestimo) { 
        if (!loanDetailModal) return;
        selectedLoanForDetail = emprestimo; 
        if(loanDetailModalTitleElement) loanDetailModalTitleElement.textContent = emprestimo.livro_titulo || "Detalhes";
        if(loanDetailModalCoverElement) loanDetailModalCoverElement.src = emprestimo.livro_detalhes?.capa_url || `https://placehold.co/300x450/e2e8f0/64748b?text=Capa`;
        if(loanDetailModalISBNElement) loanDetailModalISBNElement.textContent = emprestimo.livro_detalhes?.isbn || 'N/A';
        if(loanDetailModalAutorElement) loanDetailModalAutorElement.textContent = emprestimo.livro_detalhes?.autor || 'N/A';
        if(loanDetailModalAnoElement) loanDetailModalAnoElement.textContent = emprestimo.livro_detalhes?.ano_publicacao || 'N/A';
        if(loanDetailModalDataAdicionadoElement) loanDetailModalDataAdicionadoElement.textContent = emprestimo.livro_detalhes?.data_cadastro_livro ? new Date(emprestimo.livro_detalhes.data_cadastro_livro).toLocaleDateString('pt-BR') : 'N/A';
        if(loanDetailLeitor) loanDetailLeitor.textContent = emprestimo.leitor_nome || 'N/A';
        if(loanDetailDataEmprestimo) loanDetailDataEmprestimo.textContent = emprestimo.data_emprestimo ? new Date(emprestimo.data_emprestimo).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'N/A';
        if(loanDetailDataDevolucaoPrevista) loanDetailDataDevolucaoPrevista.textContent = emprestimo.data_devolucao_prevista ? new Date(emprestimo.data_devolucao_prevista).toLocaleDateString('pt-BR') : 'N/A';
        if(loanDetailDataDevolucaoRealContainer && loanDetailDataDevolucaoReal){
            if(emprestimo.data_devolucao_real){ loanDetailDataDevolucaoReal.textContent = new Date(emprestimo.data_devolucao_real).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}); loanDetailDataDevolucaoRealContainer.classList.remove('hidden');} 
            else { loanDetailDataDevolucaoRealContainer.classList.add('hidden');}
        }
        if (currentUser && currentUser.role === 'admin' && emprestimo.status === 'emprestado') { 
            if(registrarDevolucaoButton) {
                registrarDevolucaoButton.classList.remove('hidden');
                const newBtn = registrarDevolucaoButton.cloneNode(true); newBtn.innerHTML = registrarDevolucaoButton.innerHTML;
                if(registrarDevolucaoButton.parentNode) registrarDevolucaoButton.parentNode.replaceChild(newBtn, registrarDevolucaoButton);
                registrarDevolucaoButton = newBtn; 
                registrarDevolucaoButton.addEventListener('click', () => handleRegistrarDevolucao(emprestimo.id_emprestimo)); 
            }
        } else { if(registrarDevolucaoButton) registrarDevolucaoButton.classList.add('hidden'); }
        if(loanDetailModal) loanDetailModal.classList.remove('hidden'); document.body.classList.add('overflow-hidden'); 
    }

    function closeLoanDetailModal() { 
        if (loanDetailModal) loanDetailModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden'); selectedLoanForDetail = null;
    }

    async function carregarHistoricoEmprestimos() { 
        if (!currentUser || currentUser.role !== 'cliente') {
            if(loanHistoryContent) loanHistoryContent.innerHTML = '<p class="text-center text-gray-500">Apenas clientes podem ver seu histórico.</p>';
            return;
        }
        if(loanHistoryContent) loanHistoryContent.innerHTML = `<div class="col-span-full text-center p-8">Carregando histórico...</div>`;
        try {
            const response = await fetch(`${backendUrl}/api/historico_emprestimos?username=${encodeURIComponent(currentUser.username)}`);
            if (response.status === 401) { logout(); throw new Error("Sessão expirada."); }
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.erro || `Erro ${response.status}`);
            }
            const historico = await response.json();
            renderizarHistoricoEmprestimos(historico);
        } catch (error) {
            showMessage(error.message, 'error');
            if(loanHistoryContent) loanHistoryContent.innerHTML = `<div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-red-500">Erro ao carregar histórico.</div>`;
        }
    }

    function renderizarHistoricoEmprestimos(historico) { 
        if(!loanHistoryContent) return;
        loanHistoryContent.innerHTML = '';
        if (!historico || historico.length === 0) {
            loanHistoryContent.innerHTML = `<div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-gray-500">Sem histórico de empréstimos.</div>`;
            return;
        }
        const list = document.createElement('ul'); list.className = 'space-y-3'; 
        historico.forEach(emp => {
            const item = document.createElement('li');
            item.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center';
            const dataEmpF = emp.data_emprestimo ? new Date(emp.data_emprestimo).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            const dataDevRealF = emp.data_devolucao_real ? new Date(emp.data_devolucao_real).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : (emp.status === 'emprestado' || emp.status === 'atrasado' ? 'Não devolvido' : 'N/A');
            let statusInfo = getLoanStatus(emp); 
            item.innerHTML = `<div class="flex items-center mb-2 sm:mb-0"> <img src="${emp.livro_detalhes?.capa_url || `https://placehold.co/40x56/e2e8f0/64748b?text=Capa`}" alt="Capa" class="w-10 h-14 object-cover rounded mr-3"> <div> <h4 class="font-semibold text-sky-700 text-md">${emp.livro_titulo || 'Desconhecido'}</h4> <p class="text-xs text-gray-500">${emp.livro_detalhes?.autor || 'Desconhecido'}</p> <p class="text-xs text-gray-500 mt-1">Emprestado em: ${dataEmpF} | Devolvido em: ${dataDevRealF}</p> </div> </div> <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.colorClass} self-start sm:self-center">${statusInfo.text}</span>`;
            list.appendChild(item);
        });
        loanHistoryContent.appendChild(list);
    }

    async function fetchUserWishlist() { 
        if (!currentUser) return;
        try {
            const response = await fetch(`${backendUrl}/api/wishlist?username=${encodeURIComponent(currentUser.username)}`);
            if (!response.ok) throw new Error('Erro ao buscar lista de desejos.');
            const data = await response.json();
            userWishlist = data.map(item => item.id); 
            if (currentView === 'wishlist') renderizarListaDesejos(data); 
            else if (currentView === 'all-books') aplicarFiltrosErenderizar(); 
        } catch (error) { console.error("Erro ao buscar lista de desejos:", error); }
    }

    async function handleWishlistToggle(event) { 
        event.stopPropagation(); 
        if (!currentUser) { showMessage("Você precisa estar logado.", "error"); return; }
        const button = event.currentTarget; const livroId = button.dataset.livroId;
        const isWishlisted = userWishlist.includes(livroId); const action = isWishlisted ? 'remove' : 'add';
        button.disabled = true; const originalHTML = button.innerHTML;
        button.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" ...></svg> ...`;
        try {
            const response = await fetch(`${backendUrl}/api/wishlist/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser.username, livro_id: livroId }) });
            if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.erro || `Erro.`); }
            const data = await response.json(); showMessage(data.mensagem, 'success');
            if (action === 'add') userWishlist.push(livroId); else userWishlist = userWishlist.filter(id => id !== livroId);
            if (currentView === 'all-books') aplicarFiltrosErenderizar(); 
            else if (currentView === 'wishlist') carregarListaDesejos(); 
        } catch (error) { showMessage(error.message, 'error'); button.innerHTML = originalHTML;  } 
        finally { 
            button.disabled = false;
            // Re-renderiza o botão para refletir o estado atualizado, mesmo que a view não seja recarregada
            const isNowWishlisted = userWishlist.includes(livroId);
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="${isNowWishlisted ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>${isNowWishlisted ? 'Na Lista' : 'Desejo'}`;
            button.classList.toggle('bg-pink-500', isNowWishlisted); button.classList.toggle('hover:bg-pink-600', isNowWishlisted); button.classList.toggle('text-white', isNowWishlisted);
            button.classList.toggle('bg-gray-200', !isNowWishlisted); button.classList.toggle('hover:bg-gray-300', !isNowWishlisted); button.classList.toggle('text-gray-700', !isNowWishlisted);
            button.title = isNowWishlisted ? 'Remover da Lista de Desejos' : 'Adicionar à Lista de Desejos';
        }
    }

    async function carregarListaDesejos() { 
        if (!currentUser) { if(wishlistContent) wishlistContent.innerHTML = '<p>Faça login para ver sua lista.</p>'; return; }
        if(wishlistContent) wishlistContent.innerHTML = `<div class="col-span-full text-center p-8">Carregando...</div>`;
        try {
            const response = await fetch(`${backendUrl}/api/wishlist?username=${encodeURIComponent(currentUser.username)}`);
            if (!response.ok) throw new Error('Erro ao buscar lista de desejos.');
            const wishlistComDetalhes = await response.json();
            userWishlist = wishlistComDetalhes.map(livro => livro.id); 
            renderizarListaDesejos(wishlistComDetalhes); 
        } catch (error) {
            showMessage("Erro ao carregar sua lista de desejos.", "error");
            if(wishlistContent) wishlistContent.innerHTML = `<div class="col-span-full bg-white p-8 rounded-lg shadow text-center text-red-500">Não foi possível carregar.</div>`;
        }
    }

    function renderizarListaDesejos(livrosNaLista) { 
        if(!wishlistContent) { return; }
        wishlistContent.innerHTML = ''; 
        if (!livrosNaLista || livrosNaLista.length === 0) {
            wishlistContent.className = 'col-span-full'; 
            wishlistContent.innerHTML = `<div class="bg-white p-8 rounded-lg shadow text-center text-gray-500">Sua lista de desejos está vazia.</div>`;
            return;
        }
        wishlistContent.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
        renderizarLivros(wishlistContent, livrosNaLista); 
    }
    
    async function handleRegistrarDevolucao(idEmprestimo) { 
        openConfirmationModal( "Confirmar Devolução", "Registrar a devolução deste livro?",
            async () => { 
                const btnDev = document.getElementById('registrarDevolucaoButton'); 
                let originalBtnText = '';
                if (btnDev) { originalBtnText = btnDev.innerHTML; btnDev.innerHTML = `Registrando...`; btnDev.disabled = true; } 
                else { showMessage("Registrando...", "info"); }
                try {
                    const response = await fetch(`${backendUrl}/api/registrar_devolucao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_emprestimo: idEmprestimo }) });
                    if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.erro || `Erro.`); }
                    const data = await response.json(); showMessage(data.mensagem || "Devolução registrada!", "success");
                    closeLoanDetailModal();
                    if (currentView === 'my-loans' && currentUser && currentUser.role === 'cliente') carregarMeusEmprestimos(); 
                    else if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'atendente')) { 
                        if (typeof aplicarFiltrosErenderizar === 'function') aplicarFiltrosErenderizar(); 
                        if (window.location.pathname.includes('gerenciar_emprestimos.html') && typeof carregarTodosEmprestimosAtivos === 'function') carregarTodosEmprestimosAtivos();
                    }
                } catch (error) { showMessage(`Erro: ${error.message}`, "error"); } 
                finally { if (btnDev) { btnDev.innerHTML = originalBtnText; btnDev.disabled = false; } }
            }
        );
    }

    async function popularFiltroGeneros() { 
        if (!genreFilterSelect) return;
        try {
            const response = await fetch(`${backendUrl}/api/generos`);
            if (!response.ok) throw new Error('Erro ao buscar gêneros.');
            const generosDaApi = await response.json();
            while (genreFilterSelect.options.length > 1) genreFilterSelect.remove(1);
            if (Array.isArray(generosDaApi)) {
                generosDaApi.forEach(genero => { const option = document.createElement('option'); option.value = genero; option.textContent = genero; genreFilterSelect.appendChild(option); });
            }
        } catch (error) { showMessage("Não foi possível carregar filtros de gênero.", "error"); }
    }

    function aplicarFiltrosErenderizar() { 
        if (currentView === 'all-books' || (currentUser && ['admin', 'catalogador', 'atendente', 'analista'].includes(currentUser.role))) {
            carregarEListarLivros();
        } else if (currentView === 'wishlist') {
            carregarListaDesejos(); 
        }
    }

    function openSuggestBookModal() {
        if (!currentUser || currentUser.role !== 'cliente') {
            showMessage("Apenas clientes podem sugerir livros.", "error");
            return;
        }
        if(formSuggestBook) formSuggestBook.reset();
        if(suggestBookModal) suggestBookModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    function closeSuggestBookModal() {
        if(suggestBookModal) suggestBookModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    async function handleSuggestBookSubmit(event) {
        event.preventDefault();
        if (!formSuggestBook || !currentUser) return;
        const formData = new FormData(formSuggestBook);
        const sugestao = {
            titulo_sugerido: formData.get('titulo_sugerido').trim(),
            autor_sugerido: formData.get('autor_sugerido').trim(),
            isbn_sugerido: formData.get('isbn_sugerido').trim(),
            observacao_cliente: formData.get('observacao_cliente').trim(),
            sugerido_por_username: currentUser.username, 
            sugerido_por_nome: currentUser.nome 
        };
        if (!sugestao.titulo_sugerido || !sugestao.autor_sugerido) {
            showMessage("Título e Autor são obrigatórios para a sugestão.", "error"); return;
        }
        const originalButtonHTML = submitSuggestionButton.innerHTML;
        submitSuggestionButton.disabled = true;
        submitSuggestionButton.innerHTML = `Enviando...`;
        try {
            const response = await fetch(`${backendUrl}/api/sugestoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sugestao)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || `Erro HTTP ${response.status}`);
            showMessage(result.mensagem || "Sugestão enviada!", "success");
            closeSuggestBookModal();
            fetchMySuggestions(); 
        } catch (error) {
            showMessage(`Erro: ${error.message}`, "error");
        } finally {
            submitSuggestionButton.disabled = false;
            submitSuggestionButton.innerHTML = originalButtonHTML;
        }
    }

    async function fetchMySuggestions() {
        if (!mySuggestionsList || !currentUser) {
            if(mySuggestionsList) mySuggestionsList.innerHTML = '<p class="text-gray-500 italic">Faça login para ver suas sugestões.</p>';
            return;
        }
        mySuggestionsList.innerHTML = '<p class="text-gray-500 italic">Carregando suas sugestões...</p>';
        try {
            // Adiciona headers de autenticação simulados se necessário para o backend
            const headers = {};
            if (currentUser && currentUser.username) {
                headers['X-User-Username'] = currentUser.username;
                headers['X-User-Role'] = currentUser.role;
            }
            const response = await fetch(`${backendUrl}/api/sugestoes/minhas?username=${encodeURIComponent(currentUser.username)}`, { headers });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.erro || `Erro ${response.status} ao buscar suas sugestões.`);
            }
            const sugestoes = await response.json();
            renderMySuggestions(sugestoes);
        } catch (error) {
            console.error("Erro em fetchMySuggestions:", error);
            showMessage("Erro ao carregar suas sugestões.", "error");
            if(mySuggestionsList) mySuggestionsList.innerHTML = '<p class="text-red-500 italic">Não foi possível carregar suas sugestões.</p>';
        }
    }

    function renderMySuggestions(sugestoes) {
        if (!mySuggestionsList) return;
        mySuggestionsList.innerHTML = '';
        if (!sugestoes || sugestoes.length === 0) {
            mySuggestionsList.innerHTML = '<p class="text-gray-500 italic">Você ainda não fez nenhuma sugestão.</p>';
            return;
        }
        sugestoes.sort((a, b) => new Date(b.data_sugestao) - new Date(a.data_sugestao)); 
        sugestoes.forEach(sug => {
            const div = document.createElement('div');
            div.className = 'p-4 border rounded-md bg-white shadow-sm';
            let statusClass = 'text-gray-600';
            let statusText = sug.status_sugestao.charAt(0).toUpperCase() + sug.status_sugestao.slice(1);
            if (sug.status_sugestao === 'aprovada') { statusClass = 'text-green-600'; statusText = 'Aprovada'; }
            else if (sug.status_sugestao === 'rejeitada') { statusClass = 'text-red-600'; statusText = 'Rejeitada'; }
            else if (sug.status_sugestao === 'adquirido') { statusClass = 'text-blue-600'; statusText = 'Adquirido!'; }
            else if (sug.status_sugestao === 'pendente') { statusClass = 'text-yellow-600'; statusText = 'Pendente'; }
            div.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <h4 class="font-semibold text-md text-sky-700">${sug.titulo_sugerido}</h4>
                    <span class="text-xs px-2 py-0.5 rounded-full font-medium ${statusClass} bg-opacity-20 ${
                        sug.status_sugestao === 'aprovada' ? 'bg-green-100' : 
                        sug.status_sugestao === 'rejeitada' ? 'bg-red-100' :
                        sug.status_sugestao === 'adquirido' ? 'bg-blue-100' :
                        sug.status_sugestao === 'pendente' ? 'bg-yellow-100' : 'bg-gray-100'
                    }">${statusText}</span>
                </div>
                <p class="text-sm text-gray-600"><strong>Autor:</strong> ${sug.autor_sugerido}</p>
                ${sug.isbn_sugerido ? `<p class="text-xs text-gray-500"><strong>ISBN:</strong> ${sug.isbn_sugerido}</p>` : ''}
                ${sug.observacao_cliente ? `<p class="text-xs text-gray-500 mt-1 italic"><strong>Sua observação:</strong> "${sug.observacao_cliente}"</p>` : ''}
                <p class="text-xs text-gray-400 mt-2">Sugerido em: ${new Date(sug.data_sugestao).toLocaleDateString('pt-BR')}</p>
                ${sug.admin_feedback ? `<p class="text-xs text-blue-700 mt-1 pt-1 border-t border-gray-200"><strong>Feedback da Biblioteca:</strong> ${sug.admin_feedback}</p>` : ''}
            `;
            mySuggestionsList.appendChild(div);
        });
    }
    
    // --- Listeners de Evento ---
    if (logoutButton) logoutButton.addEventListener('click', logout);
    if (openAddBookModalButton) openAddBookModalButton.addEventListener('click', openAddBookModalHandler);
    if (closeAddBookModalButton) closeAddBookModalButton.addEventListener('click', closeAddBookModalHandler);
    if (addBookModalOverlay) addBookModalOverlay.addEventListener('click', closeAddBookModalHandler);
    
    if (fetchIsbnInfoButton && isbnInputModal) { 
        fetchIsbnInfoButton.addEventListener('click', async function() { 
            const isbn = isbnInputModal.value.trim();
            if (!isbn) { showMessage('Insira um ISBN.', 'error'); return; }
            const originalBtnText = fetchIsbnInfoButton.innerHTML;
            fetchIsbnInfoButton.innerHTML = `Buscando...`; fetchIsbnInfoButton.disabled = true;
            try {
                const response = await fetch(`${backendUrl}/api/isbn_lookup?isbn=${encodeURIComponent(isbn)}`);
                if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.erro || `Erro.`);}
                const data = await response.json();
                if (data.sucesso && data.livro) {
                    if(tituloInputModal) tituloInputModal.value = data.livro.titulo || '';
                    if(autorInputModal) autorInputModal.value = data.livro.autores || '';
                    if(anoPublicacaoInputModal) anoPublicacaoInputModal.value = data.livro.ano_publicacao || '';
                    if(addCapaUrlInputModal) addCapaUrlInputModal.value = data.livro.capa_url || '';
                    if(addGeneroInputModal) addGeneroInputModal.value = data.livro.generos || '';
                    if(addEditoraInputModal) addEditoraInputModal.value = data.livro.editora || '';
                    showMessage('Informações preenchidas!', 'success');
                } else { showMessage(data.erro || 'Nenhuma informação encontrada.', 'info'); }
            } catch (error) { showMessage(`Erro ao buscar ISBN: ${error.message}`, 'error'); } 
            finally { fetchIsbnInfoButton.innerHTML = originalBtnText; fetchIsbnInfoButton.disabled = false; }
        });
    }

    if(closeBookDetailModalXButton) closeBookDetailModalXButton.addEventListener('click', closeBookDetailModal);
    if(closeBookDetailModalFooterButton) closeBookDetailModalFooterButton.addEventListener('click', closeBookDetailModal);
    if(cancelLendButton) cancelLendButton.addEventListener('click', closeBookDetailModal); 
    if(detailModalOverlay) detailModalOverlay.addEventListener('click', closeBookDetailModal);
    
    

    if (closeEditBookModalButton) closeEditBookModalButton.addEventListener('click', closeEditBookModal);
    if (editBookModalOverlay) editBookModalOverlay.addEventListener('click', closeEditBookModal);
    
    if (formAdicionarLivro) { 
        formAdicionarLivro.addEventListener('submit', async function(event) { 
            event.preventDefault();
            if (!currentUser || !['admin', 'catalogador'].includes(currentUser.role)) { 
                showMessage("Permissão negada.", "error"); return; 
            }
            const btn = formAdicionarLivro.querySelector('button[type="submit"]'); const originalText = btn.innerHTML;
            btn.innerHTML = `Salvando...`; btn.disabled = true;
            const formData = new FormData(formAdicionarLivro); 
            if (!formData.get('titulo').trim() || !formData.get('autor').trim()) {
                showMessage('Título e Autor são obrigatórios!', 'error'); btn.innerHTML = originalText; btn.disabled = false; return;
            }
            try {
                const headers = {}; if (currentUser) { headers['X-User-Username'] = currentUser.username; headers['X-User-Role'] = currentUser.role; }
                const response = await fetch(`${backendUrl}/api/livros`, { method: 'POST', body: formData, headers: headers });
                if (response.status === 401) { logout(); throw new Error("Sessão expirada."); }
                if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.erro || `Erro HTTP ${response.status}`); }
                const data = await response.json(); showMessage(data.mensagem || 'Livro adicionado!', 'success'); 
                closeAddBookModalHandler(); popularFiltroGeneros(); aplicarFiltrosErenderizar(); 
            } catch (error) { showMessage(`Erro: ${error.message}`, 'error'); } 
            finally { btn.innerHTML = originalText; btn.disabled = false; if (addCapaFileInput) addCapaFileInput.value = ''; }
        });
    }

    if (formEditarLivro) {
        formEditarLivro.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (!selectedBookForEdit || !selectedBookForEdit.id || !currentUser || !['admin', 'catalogador'].includes(currentUser.role)) {
                showMessage("Erro ou permissão negada.", "error"); return;
            }
            const btn = formEditarLivro.querySelector('button[type="submit"]'); const originalText = btn.innerHTML;
            btn.innerHTML = `Salvando...`; btn.disabled = true;
            const formData = new FormData(formEditarLivro); 
            if (!formData.get('titulo').trim() || !formData.get('autor').trim()) {
                showMessage('Título e Autor são obrigatórios!', 'error'); btn.innerHTML = originalText; btn.disabled = false; return;
            }
            try {
                const headers = {}; if (currentUser) { headers['X-User-Username'] = currentUser.username; headers['X-User-Role'] = currentUser.role; }
                const response = await fetch(`${backendUrl}/api/livros/${selectedBookForEdit.id}`, { method: 'PUT', body: formData, headers: headers });
                if (response.status === 401) { logout(); throw new Error("Sessão expirada."); }
                if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.erro || `Erro HTTP ${response.status}`);}
                const data = await response.json(); showMessage(data.mensagem || 'Livro atualizado!', 'success');
                closeEditBookModal(); aplicarFiltrosErenderizar(); 
            } catch (error) { showMessage(`Erro: ${error.message}`, 'error'); } 
            finally { btn.innerHTML = originalText; btn.disabled = false; if (editCapaFile) editCapaFile.value = ''; }
        });
    }

    if (formEmprestarLivro) { 
        formEmprestarLivro.addEventListener('submit', async function(event) { 
            event.preventDefault();
            if (!selectedBookForDetail || !currentUser) { showMessage("Erro.", "error"); return; }
            const leitorNomeParaEmprestimo = leitorNomeInput.value.trim();
            const emprestimoDados = {
                livro_id: selectedBookForDetail.id, livro_titulo: selectedBookForDetail.titulo, 
                leitor_nome: leitorNomeParaEmprestimo, data_devolucao: dataDevolucaoInput.value,
                cliente_username: currentUser.role === 'cliente' ? currentUser.username : leitorNomeParaEmprestimo
            };
            if (!emprestimoDados.leitor_nome || !emprestimoDados.data_devolucao) { showMessage("Dados obrigatórios.", "error"); return; }
            const originalBtnContent = submitLendButton.innerHTML; submitLendButton.innerHTML = `Confirmando...`; submitLendButton.disabled = true;
            try {
                const headers = {}; if (currentUser) { headers['X-User-Username'] = currentUser.username; headers['X-User-Role'] = currentUser.role; }
                const response = await fetch(`${backendUrl}/api/emprestar_livro`, { method: 'POST', headers: {'Content-Type': 'application/json', ...headers}, body: JSON.stringify(emprestimoDados) });
                if (response.status === 401) { logout(); throw new Error("Sessão expirada."); }
                if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.erro || `Erro ${response.status}`); }
                const data = await response.json(); showMessage(data.mensagem || "Empréstimo registrado!", "success"); 
                closeBookDetailModal(); aplicarFiltrosErenderizar(); 
                if (currentView === 'my-loans') carregarMeusEmprestimos();
            } catch (err) { showMessage(`Erro: ${err.message}`, "error"); } 
            finally { submitLendButton.innerHTML = originalBtnContent; submitLendButton.disabled = false; }
        });
    }

    if (formAddReview) {
        formAddReview.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (!currentUser || !selectedBookForDetail) { showMessage("Erro.", "error"); return; }
            const nota = parseInt(reviewRatingValueInput.value); const comentario = reviewCommentText.value.trim();
            if (!nota || nota < 1 || nota > 5) { showMessage("Selecione uma nota (1-5).", "error"); return; }
            const originalBtnText = submitReviewButton.textContent; submitReviewButton.innerHTML = `Enviando...`; submitReviewButton.disabled = true;
            try {
                const headers = {'Content-Type': 'application/json'}; if (currentUser) { headers['X-User-Username'] = currentUser.username; headers['X-User-Role'] = currentUser.role; }
                const response = await fetch(`${backendUrl}/api/livros/${selectedBookForDetail.id}/avaliacoes`, { method: 'POST', headers: headers, body: JSON.stringify({ cliente_username: currentUser.username, nota: nota, comentario: comentario }) });
                submitReviewButton.textContent = originalBtnText; submitReviewButton.disabled = false; 
                if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.erro || `Erro.`); }
                const data = await response.json(); showMessage(data.mensagem || "Avaliação enviada!", "success");
                formAddReview.reset(); resetStarRating(); fetchAndRenderReviews(selectedBookForDetail.id); 
            } catch (error) { showMessage(`Erro: ${error.message}`, "error"); submitReviewButton.textContent = originalBtnText; submitReviewButton.disabled = false; }
        });
    }
    
    if (starRatingInputContainer) {
        const stars = starRatingInputContainer.querySelectorAll('.star');
        stars.forEach(star => {
            star.addEventListener('mouseover', function() {
                const parent = this.parentNode; const starsInParent = parent.querySelectorAll('.star');
                const hoverValue = parseInt(this.dataset.value);
                starsInParent.forEach(s => s.classList.toggle('selected', parseInt(s.dataset.value) <= hoverValue));
            });
            star.addEventListener('mouseout', function() {
                const parent = this.parentNode; const starsInParent = parent.querySelectorAll('.star');
                const selectedRating = reviewRatingValueInput ? (parseInt(reviewRatingValueInput.value) || 0) : 0;
                starsInParent.forEach(s => s.classList.toggle('selected', parseInt(s.dataset.value) <= selectedRating));
            });
            star.addEventListener('click', function() {
                const value = this.dataset.value; if(reviewRatingValueInput) reviewRatingValueInput.value = value;
                const parent = this.parentNode; const starsInParentOnClick = parent.querySelectorAll('.star');
                starsInParentOnClick.forEach(s => s.classList.toggle('selected', parseInt(s.dataset.value) <= parseInt(value)));
            });
        });
    }

    if (confirmModalConfirmButton) { confirmModalConfirmButton.addEventListener('click', () => { if (typeof currentActionToConfirm === 'function') { currentActionToConfirm(); } closeConfirmationModal(); }); }
    if (confirmModalCancelButton) confirmModalCancelButton.addEventListener('click', closeConfirmationModal);
    if (confirmModalOverlay) confirmModalOverlay.addEventListener('click', closeConfirmationModal);

    if (searchInput) searchInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(aplicarFiltrosErenderizar, 300); });
    if (genreFilterSelect) genreFilterSelect.addEventListener('change', aplicarFiltrosErenderizar);

    if(closeClientLoanDetailModalButton) closeClientLoanDetailModalButton.addEventListener('click', closeClientLoanDetailModal);
    if(clientLoanDetailModalOverlay) clientLoanDetailModalOverlay.addEventListener('click', closeClientLoanDetailModal);

    if (openSuggestBookModalButton) openSuggestBookModalButton.addEventListener('click', openSuggestBookModal);
    if (closeSuggestBookModalButton) closeSuggestBookModalButton.addEventListener('click', closeSuggestBookModal);
    if (suggestBookModalOverlay) suggestBookModalOverlay.addEventListener('click', closeSuggestBookModal);
    if (formSuggestBook) formSuggestBook.addEventListener('submit', handleSuggestBookSubmit);

    // Inicialização
    checkLoginStatus();
    console.log("Fim da execução inicial do script.js v20. UI Dinâmica por Papel.");
});
