document.addEventListener('DOMContentLoaded', function() {
    console.log("manage_loans_script.js: DOM Carregado. v7.1 (Filtros Avançados e Correções)");

    // --- Seletores de Elementos ---
    const userGreeting = document.getElementById('user-greeting');
    const userAvatar = document.getElementById('user-avatar');
    const logoutButton = document.getElementById('logout-button');
    const adminManageLoansView = document.getElementById('admin-manage-loans-view');
    const accessDeniedView = document.getElementById('access-denied');
    const loginPromptAdminLoans = document.getElementById('login-prompt-admin-loans');
    const loansTableBody = document.getElementById('loans-table-body');
    const noLoansMessage = document.getElementById('no-loans-message');
    const messageContainer = document.getElementById('message-container');

    // Filtros Avançados
    const loanSearchInput = document.getElementById('loan-search-input-adv'); // ID do HTML de filtros avançados
    const loanStatusFilter = document.getElementById('loan-status-filter');
    const loanDateFromInput = document.getElementById('loan-date-from');
    const loanDateToInput = document.getElementById('loan-date-to');
    const applyLoanFiltersButton = document.getElementById('apply-loan-filters-button');
    const clearLoanFiltersButton = document.getElementById('clear-loan-filters-button');

    // Modal de Detalhes do Empréstimo
    const loanDetailModal = document.getElementById('loanDetailModal');
    const loanDetailModalTitle = document.getElementById('loanDetailModalTitle');
    const loanDetailModalCover = document.getElementById('loanDetailModalCover');
    const loanDetailModalISBN = document.getElementById('loanDetailModalISBN');
    const loanDetailModalAutor = document.getElementById('loanDetailModalAutor');
    const loanDetailModalAno = document.getElementById('loanDetailModalAno');
    const loanDetailModalDataAdicionado = document.getElementById('loanDetailModalDataAdicionado');
    const loanDetailLeitor = document.getElementById('loanDetailLeitor');
    const loanDetailDataEmprestimo = document.getElementById('loanDetailDataEmprestimo');
    const loanDetailDataDevolucaoPrevista = document.getElementById('loanDetailDataDevolucaoPrevista');
    const loanDetailDataDevolucaoRealContainer = document.getElementById('loanDetailDataDevolucaoRealContainer');
    const loanDetailDataDevolucaoReal = document.getElementById('loanDetailDataDevolucaoReal');
    
    const loanDetailFineInfoSection = document.getElementById('loanDetailFineInfoSection');
    const loanDetailDiasAtraso = document.getElementById('loanDetailDiasAtraso');
    const loanDetailMultaValor = document.getElementById('loanDetailMultaValor');
    const loanDetailMultaStatus = document.getElementById('loanDetailMultaStatus');
    const loanDetailMultaDataPagamentoContainer = document.getElementById('loanDetailMultaDataPagamentoContainer');
    const loanDetailMultaDataPagamento = document.getElementById('loanDetailMultaDataPagamento');
    const loanDetailMultaJustificativaContainer = document.getElementById('loanDetailMultaJustificativaContainer');
    const loanDetailMultaJustificativa = document.getElementById('loanDetailMultaJustificativa');

    const registrarDevolucaoButtonFromModal = document.getElementById('registrarDevolucaoButtonFromModal');
    const pagarMultaButton = document.getElementById('pagarMultaButton');
    const isentarMultaButton = document.getElementById('isentarMultaButton');

    const closeLoanDetailModalButton = document.getElementById('closeLoanDetailModalButton');
    const closeLoanDetailModalFooterButton = document.getElementById('closeLoanDetailModalFooterButton');
    const loanDetailModalOverlay = loanDetailModal ? loanDetailModal.querySelector('.modal-overlay-loan-detail') : null;

    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationModalTitle = document.getElementById('confirmationModalTitle');
    const confirmationModalMessage = document.getElementById('confirmationModalMessage');
    const confirmModalConfirmButton = document.getElementById('confirmModalConfirmButton');
    const confirmModalCancelButton = document.getElementById('confirmModalCancelButton');
    const confirmModalOverlay = confirmationModal ? confirmationModal.querySelector('.modal-overlay-confirm') : null;

    const exemptFineModal = document.getElementById('exemptFineModal');
    const formExemptFine = document.getElementById('formExemptFine');
    const exemptFineLoanIdInput = document.getElementById('exemptFineLoanId');
    const exemptFineJustificationInput = document.getElementById('exemptFineJustification');
    const cancelExemptFineButton = document.getElementById('cancelExemptFineButton');
    const exemptFineModalOverlay = exemptFineModal ? exemptFineModal.querySelector('.modal-overlay-exempt-fine') : null;

    const backendUrl = 'https://shelfwise-backend-698679522199.southamerica-east1.run.app'; // SUA URL DO CLOUD RUN
    let currentUser = null;
    let allLoansCache = []; 
    let selectedLoanForModal = null;
    let currentActionToConfirm = null; 

    if(document.getElementById('currentYearManageLoans')) {
      document.getElementById('currentYearManageLoans').textContent = new Date().getFullYear();
    }

    // --- FUNÇÕES AUXILIARES DE DATA ---
    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function isBefore(date1, date2) {
        const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
        return d1.getTime() < d2.getTime();
    }

    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
    
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
            messageDiv.addEventListener('transitionend', () => { 
                 if (messageContainer && messageContainer.contains(messageDiv)) messageContainer.removeChild(messageDiv);
            });
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
        if(loginPromptAdminLoans) loginPromptAdminLoans.classList.add('hidden');
        if(accessDeniedView) accessDeniedView.classList.add('hidden');
        if(adminManageLoansView) adminManageLoansView.classList.remove('hidden');
        fetchAllLoansWithFilters(); 
    }

    function showAccessDenied() { 
        if(adminManageLoansView) adminManageLoansView.classList.add('hidden');
        if(accessDeniedView) accessDeniedView.classList.remove('hidden');
        if(loginPromptAdminLoans) loginPromptAdminLoans.classList.add('hidden');
    }

    function showLoginPromptForAdminLoans() { 
        if(adminManageLoansView) adminManageLoansView.classList.add('hidden');
        if(accessDeniedView) accessDeniedView.classList.add('hidden');
        if(loginPromptAdminLoans) loginPromptAdminLoans.classList.remove('hidden');
    }

    function checkAdminLoginStatus() { 
        const loggedInUser = localStorage.getItem('loggedInUser');
        if (loggedInUser) {
            try {
                const user = JSON.parse(loggedInUser);
                if (user && user.username && ['admin', 'atendente'].includes(user.role)) {
                    setupAdminUI(user);
                } else {
                    showAccessDenied(); 
                }
            } catch (e) {
                localStorage.removeItem('loggedInUser');
                showLoginPromptForAdminLoans(); 
            }
        } else {
            showLoginPromptForAdminLoans(); 
        }
    }

    function logout() { 
        localStorage.removeItem('loggedInUser');
        window.location.href = "login.html"; 
    }
    
    function openLoanDetailModalForAdmin(emprestimo) {
        if (!loanDetailModal) { console.error("Modal de detalhes do empréstimo não encontrado."); return; }
        selectedLoanForModal = emprestimo;

        if(loanDetailModalTitle) loanDetailModalTitle.textContent = emprestimo.livro_titulo || "Detalhes do Empréstimo";
        if(loanDetailModalCover) loanDetailModalCover.src = emprestimo.livro_detalhes?.capa_url || `https://placehold.co/300x450/e2e8f0/64748b?text=${encodeURIComponent(emprestimo.livro_titulo || 'Capa')}`;
        if(loanDetailModalISBN) loanDetailModalISBN.textContent = emprestimo.livro_detalhes?.isbn || 'N/A';
        if(loanDetailModalAutor) loanDetailModalAutor.textContent = emprestimo.livro_detalhes?.autor || 'N/A';
        if(loanDetailModalAno) loanDetailModalAno.textContent = emprestimo.livro_detalhes?.ano_publicacao || 'N/A';
        if(loanDetailModalDataAdicionado) loanDetailModalDataAdicionado.textContent = emprestimo.livro_detalhes?.data_cadastro_livro ? new Date(emprestimo.livro_detalhes.data_cadastro_livro).toLocaleDateString('pt-BR') : 'N/A';
        
        if(loanDetailLeitor) loanDetailLeitor.textContent = emprestimo.leitor_nome_completo || emprestimo.cliente_username || 'N/A';
        if(loanDetailDataEmprestimo) loanDetailDataEmprestimo.textContent = emprestimo.data_emprestimo ? new Date(emprestimo.data_emprestimo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
        if(loanDetailDataDevolucaoPrevista) loanDetailDataDevolucaoPrevista.textContent = emprestimo.data_devolucao_prevista ? new Date(emprestimo.data_devolucao_prevista).toLocaleDateString('pt-BR') : 'N/A';

        if (loanDetailDataDevolucaoRealContainer && loanDetailDataDevolucaoReal) {
            if (emprestimo.data_devolucao_real) {
                loanDetailDataDevolucaoReal.textContent = new Date(emprestimo.data_devolucao_real).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                loanDetailDataDevolucaoRealContainer.classList.remove('hidden');
            } else {
                loanDetailDataDevolucaoRealContainer.classList.add('hidden');
            }
        }

        if (loanDetailFineInfoSection && pagarMultaButton && isentarMultaButton) {
            if (emprestimo.multa_status && emprestimo.multa_status !== 'nao_aplicavel') {
                loanDetailFineInfoSection.classList.remove('hidden');
                if(loanDetailDiasAtraso) loanDetailDiasAtraso.textContent = emprestimo.dias_atraso || 0;
                if(loanDetailMultaValor) loanDetailMultaValor.textContent = (emprestimo.multa_valor_calculado || 0).toFixed(2);
                if(loanDetailMultaStatus) loanDetailMultaStatus.textContent = emprestimo.multa_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                if(loanDetailMultaDataPagamentoContainer) loanDetailMultaDataPagamentoContainer.classList.toggle('hidden', !emprestimo.multa_data_pagamento);
                if (emprestimo.multa_data_pagamento && loanDetailMultaDataPagamento) {
                    loanDetailMultaDataPagamento.textContent = new Date(emprestimo.multa_data_pagamento).toLocaleString('pt-BR');
                }
                if(loanDetailMultaJustificativaContainer) loanDetailMultaJustificativaContainer.classList.toggle('hidden', !emprestimo.multa_justificativa_isencao);
                if (emprestimo.multa_justificativa_isencao && loanDetailMultaJustificativa) {
                    loanDetailMultaJustificativa.textContent = emprestimo.multa_justificativa_isencao;
                }

                pagarMultaButton.classList.toggle('hidden', emprestimo.multa_status !== 'pendente');
                isentarMultaButton.classList.toggle('hidden', emprestimo.multa_status !== 'pendente');
            } else {
                loanDetailFineInfoSection.classList.add('hidden');
                pagarMultaButton.classList.add('hidden');
                isentarMultaButton.classList.add('hidden');
            }
        }
        
        if(registrarDevolucaoButtonFromModal) registrarDevolucaoButtonFromModal.classList.toggle('hidden', emprestimo.status === 'devolvido');
        
        loanDetailModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    function closeLoanDetailModal() {
        if (loanDetailModal) loanDetailModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        selectedLoanForModal = null;
    }

    function openConfirmationModal(title, message, onConfirmCallback) {
        if (!confirmationModal || !confirmationModalTitle || !confirmationModalMessage || !confirmModalConfirmButton) {
            if (window.confirm(message)) { if (typeof onConfirmCallback === 'function') onConfirmCallback(); }
            return;
        }
        confirmationModalTitle.textContent = title;
        confirmationModalMessage.textContent = message;
        currentActionToConfirm = onConfirmCallback; 
        
        const newBtn = confirmModalConfirmButton.cloneNode(true);
        if (confirmModalConfirmButton.parentNode) {
            confirmModalConfirmButton.parentNode.replaceChild(newBtn, confirmModalConfirmButton);
        }
        // É crucial reatribuir a referência ao botão clonado se você pretende adicionar listeners a ele DEPOIS desta função.
        // No entanto, a prática mais segura é adicionar o listener aqui mesmo ou garantir que o ID seja único se clonar.
        // Para este caso, o listener é adicionado uma vez no final do script.
        const newConfirmBtnRef = document.getElementById('confirmModalConfirmButton'); 
        if(newConfirmBtnRef) {
            // Este listener é adicionado uma vez no final do script, não precisa ser readicionado aqui
            // a menos que a lógica de currentActionToConfirm precise de um listener específico por chamada.
        }
        
        confirmationModal.classList.remove('hidden'); document.body.classList.add('overflow-hidden');
    }

    function closeConfirmationModal() {
        if (confirmationModal) confirmationModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        currentActionToConfirm = null; 
    }

    function openExemptFineModal(loanId) {
        if(!exemptFineModal || !exemptFineLoanIdInput || !formExemptFine) return;
        formExemptFine.reset();
        exemptFineLoanIdInput.value = loanId;
        exemptFineModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    function closeExemptFineModal() {
        if(exemptFineModal) exemptFineModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    async function fetchAllLoansWithFilters() { 
        if (!currentUser || !['admin', 'atendente'].includes(currentUser.role)) {
            console.warn("fetchAllLoansWithFilters: Usuário não autorizado ou não logado.");
            return;
        }
        if(!loansTableBody || !noLoansMessage) {
            console.error("fetchAllLoansWithFilters: Elementos da tabela não encontrados.");
            return;
        }
        loansTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-10 text-gray-500">Carregando empréstimos...</td></tr>';
        noLoansMessage.classList.add('hidden');
        
        // PREPARAÇÃO DOS PARÂMETROS DE FILTRO PARA A API (se o backend for modificado para usá-los)
        // const params = new URLSearchParams();
        // if (loanSearchInput && loanSearchInput.value.trim()) {
        //     params.append('search', loanSearchInput.value.trim());
        // }
        // if (loanStatusFilter && loanStatusFilter.value) {
        //     params.append('status_emprestimo', loanStatusFilter.value); // Nome do parâmetro consistente com backend
        // }
        // if (loanDateFromInput && loanDateFromInput.value) {
        //     params.append('data_emprestimo_inicio', loanDateFromInput.value);
        // }
        // if (loanDateToInput && loanDateToInput.value) {
        //     params.append('data_emprestimo_fim', loanDateToInput.value);
        // }
        // const queryString = params.toString();
        // const apiUrl = `/api/admin/emprestimos${queryString ? '?' + queryString : ''}`;
        
        // Por enquanto, busca todos e filtra no frontend
        const apiUrl = '/api/admin/emprestimos'; 

        try {
            const headers = {'X-User-Username': currentUser.username, 'X-User-Role': currentUser.role};
            const response = await fetch(apiUrl, {headers: headers}); 

            if (response.status === 401 || response.status === 403) { logout(); throw new Error("Não autorizado."); }
            if (!response.ok) { 
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.erro || `Erro ${response.status} ao buscar empréstimos.`);
            }
            allLoansCache = await response.json();
            console.log("Empréstimos recebidos da API:", allLoansCache);
            applyFrontendFiltersAndRender(); 
        } catch (error) {
            showMessage(error.message, 'error');
            if(loansTableBody) loansTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-10 text-red-500">Falha ao carregar empréstimos.</td></tr>';
            if(noLoansMessage) { noLoansMessage.innerHTML = `<p>Falha ao carregar empréstimos.</p>`; noLoansMessage.classList.remove('hidden');}
        }
    }

    function applyFrontendFiltersAndRender() {
        if (!allLoansCache) return;
        let loansToRender = [...allLoansCache];

        const searchTerm = loanSearchInput.value.toLowerCase().trim();
        const statusValue = loanStatusFilter.value;
        const dateFromStr = loanDateFromInput.value;
        const dateToStr = loanDateToInput.value;

        if (searchTerm) {
            loansToRender = loansToRender.filter(emp =>
                (emp.livro_titulo && emp.livro_titulo.toLowerCase().includes(searchTerm)) ||
                (emp.leitor_nome_completo && emp.leitor_nome_completo.toLowerCase().includes(searchTerm)) ||
                (emp.cliente_username && emp.cliente_username.toLowerCase().includes(searchTerm)) ||
                (emp.livro_detalhes?.isbn && emp.livro_detalhes.isbn.includes(searchTerm))
            );
        }
        if (statusValue) {
            if (statusValue === 'atrasado') {
                loansToRender = loansToRender.filter(emp => getLoanStatus(emp).text === 'Atrasado');
            } else { // 'emprestado' ou 'devolvido'
                 loansToRender = loansToRender.filter(emp => emp.status === statusValue);
            }
        }
        if (dateFromStr) {
            const fromDate = new Date(dateFromStr + "T00:00:00Z"); // Considera o início do dia em UTC
            loansToRender = loansToRender.filter(emp => emp.data_emprestimo && new Date(emp.data_emprestimo) >= fromDate);
        }
        if (dateToStr) {
            const toDate = new Date(dateToStr + "T23:59:59Z"); // Considera o fim do dia em UTC
            loansToRender = loansToRender.filter(emp => emp.data_emprestimo && new Date(emp.data_emprestimo) <= toDate);
        }
        renderizarTabelaEmprestimos(loansToRender);
    }

    function getLoanStatus(emprestimo) {
        if (!emprestimo) return { text: 'Inválido', colorClass: 'bg-gray-100 text-gray-700', order: 99 };
        if (emprestimo.status === 'devolvido') {
            return { text: 'Devolvido', colorClass: 'bg-blue-100 text-blue-800', order: 3 };
        }
        const hoje = new Date(); // Data local do navegador
        const dataDevolucaoPrevistaStr = emprestimo.data_devolucao_prevista;

        if (!dataDevolucaoPrevistaStr) {
            return { text: 'Data Prev. Inválida', colorClass: 'bg-gray-100 text-gray-700', order: 4 };
        }
        
        // As datas do Firestore vêm como strings ISO 8601 (UTC)
        const dataDev = new Date(dataDevolucaoPrevistaStr); 

        if (isNaN(dataDev.getTime())) { 
             return { text: 'Data Prev. Inválida', colorClass: 'bg-gray-100 text-gray-700', order: 4 };
        }
        
        // Normaliza 'hoje' para o início do dia para comparação justa de datas
        const hojeNormalizada = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const dataDevolucaoNormalizada = new Date(dataDev.getFullYear(), dataDev.getMonth(), dataDev.getDate());

        if (dataDevolucaoNormalizada < hojeNormalizada) { 
            return { text: 'Atrasado', colorClass: 'bg-red-100 text-red-800', order: 0 };
        }
        
        const threeDaysFromNow = new Date(hojeNormalizada);
        threeDaysFromNow.setDate(hojeNormalizada.getDate() + 3);
        
        if (dataDevolucaoNormalizada <= threeDaysFromNow) {
            return { text: 'Devolver em Breve', colorClass: 'bg-orange-100 text-orange-800', order: 1 };
        }
        return { text: 'Emprestado', colorClass: 'bg-yellow-100 text-yellow-800', order: 2 };
    }

    function renderizarTabelaEmprestimos(emprestimosParaRenderizar) {
        if(!loansTableBody || !noLoansMessage) return;
        loansTableBody.innerHTML = ''; 
        if (emprestimosParaRenderizar.length === 0) {
            noLoansMessage.classList.remove('hidden');
            noLoansMessage.innerHTML = `<p>Nenhum empréstimo encontrado com os filtros aplicados.</p>`;
            return;
        }
        noLoansMessage.classList.add('hidden');

        emprestimosParaRenderizar.forEach(emprestimo => {
            const row = loansTableBody.insertRow();
            const statusInfo = getLoanStatus(emprestimo);
            const capaUrl = emprestimo.livro_detalhes?.capa_url || `https://placehold.co/40x56/e2e8f0/64748b?text=Capa`;
            const dataEmprestado = emprestimo.data_emprestimo ? new Date(emprestimo.data_emprestimo).toLocaleDateString('pt-BR') : '-';
            const dataDevolucao = emprestimo.data_devolucao_prevista ? new Date(emprestimo.data_devolucao_prevista).toLocaleDateString('pt-BR') : '-';
            
            const diasAtraso = emprestimo.dias_atraso !== undefined && emprestimo.dias_atraso !== null ? emprestimo.dias_atraso : '0';
            const multaValor = emprestimo.multa_valor_calculado !== undefined && emprestimo.multa_valor_calculado !== null ? emprestimo.multa_valor_calculado.toFixed(2) : '0.00';
            const multaStatusRaw = emprestimo.multa_status || 'nao_aplicavel';
            const multaStatus = multaStatusRaw.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            let multaStatusClass = 'text-gray-700';
            if (multaStatusRaw === 'pendente') multaStatusClass = 'text-red-600 font-semibold';
            else if (multaStatusRaw === 'paga') multaStatusClass = 'text-green-600 font-semibold';
            else if (multaStatusRaw === 'isenta') multaStatusClass = 'text-blue-600 font-semibold';

            let acoesHTML = `
                <button class="text-sky-600 hover:text-sky-800 view-loan-details-btn p-1 rounded hover:bg-sky-100" title="Ver Detalhes">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>`;
            
            if (emprestimo.status !== 'devolvido') {
                acoesHTML += `
                    <button class="text-white bg-green-500 hover:bg-green-600 return-loan-btn-table p-1.5 rounded-md shadow-sm transition-colors ml-2 flex items-center text-xs font-medium" title="Registrar Devolução" data-loan-id="${emprestimo.id_emprestimo}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l4 4m-4-4l4-4m6 9v2.5a2.5 2.5 0 01-2.5 2.5H6.5A2.5 2.5 0 014 18.5V16"></path></svg>
                    </button>`;
            }

            row.innerHTML = `
                <td class="px-3 py-3 whitespace-nowrap hidden sm:table-cell align-middle"><img src="${capaUrl}" alt="Capa" class="w-10 h-14 object-cover rounded"></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 max-w-[150px] truncate align-middle" title="${emprestimo.livro_titulo || ''}">${emprestimo.livro_titulo || 'N/A'}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500 max-w-[150px] truncate align-middle" title="${emprestimo.leitor_nome_completo || emprestimo.cliente_username || ''}">${emprestimo.leitor_nome_completo || emprestimo.cliente_username || 'N/A'}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell align-middle">${dataEmprestado}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500 align-middle">${dataDevolucao}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm align-middle"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.colorClass}">${statusInfo.text}</span></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-center align-middle ${parseInt(diasAtraso) > 0 ? 'text-red-600 font-bold' : 'text-gray-500'}">${diasAtraso}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-center align-middle ${parseFloat(multaValor) > 0 ? 'text-red-600 font-bold' : 'text-gray-500'}">${multaValor}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm align-middle"><span class="${multaStatusClass}">${multaStatus}</span></td>
                <td class="px-3 py-3 whitespace-nowrap text-center text-sm font-medium table-cell-actions align-middle">
                    <div class="flex items-center justify-center space-x-2">
                        ${acoesHTML}
                    </div>
                </td>
            `;
            const viewButton = row.querySelector('.view-loan-details-btn');
            if (viewButton) viewButton.addEventListener('click', () => openLoanDetailModalForAdmin(emprestimo));

            const returnButtonTable = row.querySelector('.return-loan-btn-table');
            if(returnButtonTable) returnButtonTable.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const loanId = e.currentTarget.dataset.loanId;
                promptForDevolucao(loanId, 'table'); // Passa 'table' como contexto
            });
        });
    }
    
    function promptForDevolucao(idEmprestimo, source) { 
        openConfirmationModal( "Confirmar Devolução", "Registrar a devolução deste livro?",
            () => proceedWithDevolucao(idEmprestimo, source) 
        );
    }

    async function proceedWithDevolucao(idEmprestimo, sourceButtonContext) { 
        let btnDevolver;
        let originalButtonHTML = '';

        if (sourceButtonContext === 'modal' && selectedLoanForModal && selectedLoanForModal.id_emprestimo === idEmprestimo) {
            btnDevolver = registrarDevolucaoButtonFromModal; // Botão do modal
        } else if (sourceButtonContext === 'table') {
            // Tenta encontrar o botão na linha da tabela (pode ser mais complexo se não houver ID direto no botão)
            // Por simplicidade, não vamos mostrar o loading no botão da tabela aqui, apenas no modal.
            // A tabela será recarregada de qualquer forma.
        }
        
        if (btnDevolver) { 
            originalButtonHTML = btnDevolver.innerHTML;
            btnDevolver.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Registrando...`;
            btnDevolver.disabled = true; 
        } else {
            showMessage("Registrando devolução...", "info");
        }

        try {
            const headers = {'Content-Type': 'application/json'};
            if(currentUser) { headers['X-User-Username'] = currentUser.username; headers['X-User-Role'] = currentUser.role; }
            const response = await fetch(`${backendUrl}/api/registrar_devolucao`, { method: 'POST', headers: headers, body: JSON.stringify({ id_emprestimo: idEmprestimo }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || `Erro ${response.status}`);
            showMessage(result.mensagem || "Devolução registrada!", "success");
            closeLoanDetailModal(); 
            fetchAllLoansWithFilters(); // Recarrega a lista com filtros aplicados
        } catch (error) {
            showMessage(`Erro: ${error.message}`, "error");
        } finally {
            if (btnDevolver) { btnDevolver.innerHTML = originalButtonHTML; btnDevolver.disabled = false; }
        }
    }

    async function handlePagarMulta(idEmprestimo) {
        openConfirmationModal("Confirmar Pagamento", "Registrar o pagamento total desta multa?", async () => {
            const btn = pagarMultaButton; // Botão no modal de detalhes
            let originalBtnHTML = '';
            if(btn) { originalBtnHTML = btn.innerHTML; btn.innerHTML = `Processando...`; btn.disabled = true; }
            try {
                const headers = {'Content-Type': 'application/json'};
                if(currentUser) { headers['X-User-Username'] = currentUser.username; headers['X-User-Role'] = currentUser.role; }
                const response = await fetch(`${backendUrl}/api/admin/emprestimos/${idEmprestimo}/pagar-multa`, { method: 'POST', headers: headers });
                const result = await response.json();
                if (!response.ok) throw new Error(result.erro || `Erro ${response.status}`);
                showMessage(result.mensagem, "success");
                closeLoanDetailModal();
                fetchAllLoansWithFilters();
            } catch (error) {
                showMessage(`Erro ao pagar multa: ${error.message}`, "error");
            } finally {
                 if(btn) { btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>Pagar Multa`; btn.disabled = false; }
            }
        });
    }

    async function handleIsentarMultaSubmit(event) {
        event.preventDefault();
        if(!formExemptFine || !exemptFineLoanIdInput || !exemptFineJustificationInput) return;
        const loanId = exemptFineLoanIdInput.value;
        const justificativa = exemptFineJustificationInput.value.trim();

        if (!justificativa) {
            showMessage("A justificativa é obrigatória para isentar a multa.", "error");
            return;
        }
        const btn = formExemptFine.querySelector('button[type="submit"]'); 
        let originalBtnHTML = '';
        if(btn) { originalBtnHTML = btn.innerHTML; btn.innerHTML = `Isentando...`; btn.disabled = true; }

        try {
            const headers = {'Content-Type': 'application/json'};
            if(currentUser) { headers['X-User-Username'] = currentUser.username; headers['X-User-Role'] = currentUser.role; }
            const response = await fetch(`${backendUrl}/api/admin/emprestimos/${loanId}/isentar-multa`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ justificativa: justificativa })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || `Erro ${response.status}`);
            showMessage(result.mensagem, "success");
            closeExemptFineModal();
            closeLoanDetailModal(); 
            fetchAllLoansWithFilters();
        } catch (error) {
            showMessage(`Erro ao isentar multa: ${error.message}`, "error");
        } finally {
            if(btn) { btn.innerHTML = originalBtnHTML; btn.disabled = false; }
        }
    }
    
    // --- LISTENERS ---
    if (logoutButton) logoutButton.addEventListener('click', logout);
    
    if(applyLoanFiltersButton) applyLoanFiltersButton.addEventListener('click', fetchAllLoansWithFilters);
    if(clearLoanFiltersButton) {
        clearLoanFiltersButton.addEventListener('click', () => {
            if(loanSearchInput) loanSearchInput.value = '';
            if(loanStatusFilter) loanStatusFilter.value = '';
            if(loanDateFromInput) loanDateFromInput.value = '';
            if(loanDateToInput) loanDateToInput.value = '';
            fetchAllLoansWithFilters();
        });
    }
    
    if(closeLoanDetailModalButton) closeLoanDetailModalButton.addEventListener('click', closeLoanDetailModal);
    if(closeLoanDetailModalFooterButton) closeLoanDetailModalFooterButton.addEventListener('click', closeLoanDetailModal);
    if(loanDetailModalOverlay) loanDetailModalOverlay.addEventListener('click', closeLoanDetailModal);
    
    if(registrarDevolucaoButtonFromModal) registrarDevolucaoButtonFromModal.addEventListener('click', () => {
        if(selectedLoanForModal) promptForDevolucao(selectedLoanForModal.id_emprestimo, 'modal');
    });
    if(pagarMultaButton) pagarMultaButton.addEventListener('click', () => {
        if(selectedLoanForModal) handlePagarMulta(selectedLoanForModal.id_emprestimo);
    });
    if(isentarMultaButton) isentarMultaButton.addEventListener('click', () => {
        if(selectedLoanForModal) openExemptFineModal(selectedLoanForModal.id_emprestimo);
    });

    if(formExemptFine) formExemptFine.addEventListener('submit', handleIsentarMultaSubmit);
    if(cancelExemptFineButton) cancelExemptFineButton.addEventListener('click', closeExemptFineModal);
    if(exemptFineModalOverlay) exemptFineModalOverlay.addEventListener('click', closeExemptFineModal);

    if(confirmModalConfirmButton) { // Adicionado listener ao botão de confirmação principal
         confirmModalConfirmButton.addEventListener('click', () => {
            if (typeof currentActionToConfirm === 'function') {
                currentActionToConfirm(); 
            }
            closeConfirmationModal();
        });
    }
    if(confirmModalCancelButton) confirmModalCancelButton.addEventListener('click', closeConfirmationModal);
    if(confirmModalOverlay) confirmModalOverlay.addEventListener('click', closeConfirmationModal);
    
    // --- INICIALIZAÇÃO ---
    checkAdminLoginStatus();
});
