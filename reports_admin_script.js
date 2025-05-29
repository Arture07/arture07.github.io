document.addEventListener('DOMContentLoaded', function() {
    // --- Seletores de Elementos ---
    const adminView = document.getElementById('admin-reports-view');
    const accessDeniedView = document.getElementById('access-denied');
    const loginPromptView = document.getElementById('login-prompt-admin-reports');
    const userGreeting = document.getElementById('user-greeting');
    const userAvatar = document.getElementById('user-avatar');
    const logoutButton = document.getElementById('logout-button');
    const messageContainer = document.getElementById('message-container');

    // Elementos de Carregamento
    const livrosMaisEmprestadosLoading = document.getElementById('livrosMaisEmprestadosLoading');
    const generosMaisPopularesLoading = document.getElementById('generosMaisPopularesLoading');
    const emprestimosPorPeriodoLoading = document.getElementById('emprestimosPorPeriodoLoading');
    const emprestimosAtrasadosLoading = document.getElementById('emprestimosAtrasadosLoading');
    
    // Tabela de Atrasados
    const tabelaAtrasadosContainer = document.getElementById('tabelaAtrasadosContainer');
    const emprestimosAtrasadosTableBody = document.getElementById('emprestimosAtrasadosTableBody');
    const noEmprestimosAtrasadosMessage = document.getElementById('noEmprestimosAtrasadosMessage');

    const backendUrl = 'https://shelfwise-backend-698679522199.southamerica-east1.run.app'; // SUA URL DO CLOUD RUN


    let currentUser = null;
    let livrosChart = null;
    let generosChart = null;
    let periodoChart = null;

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
        
        // Carregar todos os relatórios
        fetchLivrosMaisEmprestados();
        fetchGenerosMaisPopulares();
        fetchEmprestimosPorPeriodo();
        fetchEmprestimosAtrasados();
    }

    function showAccessDenied() {
        if(adminView) adminView.classList.add('hidden');
        if(accessDeniedView) accessDeniedView.classList.remove('hidden');
        if(loginPromptView) loginPromptView.classList.add('hidden');
        if(userGreeting) userGreeting.textContent = '';
        if(userAvatar) userAvatar.classList.add('hidden');
        if(logoutButton) logoutButton.classList.add('hidden');
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

    // --- Funções de Geração de Gráficos ---
    function criarGraficoBarras(canvasId, labels, data, tituloLabel, chartInstance) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) {
            console.error(`Canvas com ID '${canvasId}' não encontrado.`);
            return null;
        }
        if (chartInstance) {
            chartInstance.destroy(); // Destrói instância anterior para evitar sobreposição
        }
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: tituloLabel,
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)', // Azul
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } // Garante que o eixo Y comece em 0 e tenha passos inteiros
            }
        });
    }

    function criarGraficoPizza(canvasId, labels, data, tituloLabel, chartInstance) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
         if (!ctx) {
            console.error(`Canvas com ID '${canvasId}' não encontrado.`);
            return null;
        }
        if (chartInstance) {
            chartInstance.destroy();
        }
        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: tituloLabel,
                    data: data,
                    backgroundColor: [ // Cores variadas para pizza
                        'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)',
                        'rgba(100, 255, 100, 0.7)', 'rgba(255, 100, 100, 0.7)'
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    function criarGraficoLinha(canvasId, labels, data, tituloLabel, chartInstance) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) {
            console.error(`Canvas com ID '${canvasId}' não encontrado.`);
            return null;
        }
        if (chartInstance) {
            chartInstance.destroy();
        }
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: tituloLabel,
                    data: data,
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // --- Fetch e Renderização dos Relatórios ---
    async function fetchLivrosMaisEmprestados() {
        if(livrosMaisEmprestadosLoading) livrosMaisEmprestadosLoading.classList.remove('hidden');
        try {
            const response = await fetch(`${backendUrl}/api/admin/relatorios/livros-mais-emprestados`);
            if (!response.ok) throw new Error('Falha ao buscar dados de livros mais emprestados.');
            const dados = await response.json();
            
            const titulos = dados.map(d => d.titulo);
            const emprestimos = dados.map(d => d.emprestimos);
            
            livrosChart = criarGraficoBarras('livrosMaisEmprestadosChart', titulos, emprestimos, 'Nº de Empréstimos', livrosChart);
        } catch (error) {
            showMessage(error.message, 'error');
            console.error("Erro em fetchLivrosMaisEmprestados:", error);
        } finally {
            if(livrosMaisEmprestadosLoading) livrosMaisEmprestadosLoading.classList.add('hidden');
        }
    }

    async function fetchGenerosMaisPopulares() {
        if(generosMaisPopularesLoading) generosMaisPopularesLoading.classList.remove('hidden');
        try {
            const response = await fetch(`${backendUrl}/api/admin/relatorios/generos-mais-populares`);
            if (!response.ok) throw new Error('Falha ao buscar dados de gêneros mais populares.');
            const dados = await response.json();

            const nomesGeneros = dados.map(d => d.genero);
            const contagensGeneros = dados.map(d => d.emprestimos);

            generosChart = criarGraficoPizza('generosMaisPopularesChart', nomesGeneros, contagensGeneros, 'Empréstimos por Gênero', generosChart);
        } catch (error) {
            showMessage(error.message, 'error');
            console.error("Erro em fetchGenerosMaisPopulares:", error);
        } finally {
            if(generosMaisPopularesLoading) generosMaisPopularesLoading.classList.add('hidden');
        }
    }

    async function fetchEmprestimosPorPeriodo() {
        if(emprestimosPorPeriodoLoading) emprestimosPorPeriodoLoading.classList.remove('hidden');
        try {
            const response = await fetch(`${backendUrl}/api/admin/relatorios/emprestimos-por-periodo?dias=30`); // Padrão 30 dias
            if (!response.ok) throw new Error('Falha ao buscar dados de empréstimos por período.');
            const dados = await response.json();

            const dias = dados.map(d => new Date(d.dia + 'T00:00:00Z').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})); // Formata dia
            const contagens = dados.map(d => d.emprestimos);

            periodoChart = criarGraficoLinha('emprestimosPorPeriodoChart', dias, contagens, 'Nº de Empréstimos', periodoChart);
        } catch (error) {
            showMessage(error.message, 'error');
            console.error("Erro em fetchEmprestimosPorPeriodo:", error);
        } finally {
            if(emprestimosPorPeriodoLoading) emprestimosPorPeriodoLoading.classList.add('hidden');
        }
    }

    async function fetchEmprestimosAtrasados() {
        if(emprestimosAtrasadosLoading) emprestimosAtrasadosLoading.classList.remove('hidden');
        if(tabelaAtrasadosContainer) tabelaAtrasadosContainer.classList.add('hidden');
        if(noEmprestimosAtrasadosMessage) noEmprestimosAtrasadosMessage.classList.add('hidden');

        try {
            const response = await fetch(`${backendUrl}/api/admin/relatorios/emprestimos-atrasados`);
            if (!response.ok) throw new Error('Falha ao buscar empréstimos atrasados.');
            const dados = await response.json();
            renderTabelaAtrasados(dados);
        } catch (error) {
            showMessage(error.message, 'error');
            console.error("Erro em fetchEmprestimosAtrasados:", error);
            if(noEmprestimosAtrasadosMessage) {
                noEmprestimosAtrasadosMessage.textContent = "Erro ao carregar dados.";
                noEmprestimosAtrasadosMessage.classList.remove('hidden');
            }
        } finally {
            if(emprestimosAtrasadosLoading) emprestimosAtrasadosLoading.classList.add('hidden');
        }
    }

    function renderTabelaAtrasados(emprestimos) {
        if (!emprestimosAtrasadosTableBody || !tabelaAtrasadosContainer || !noEmprestimosAtrasadosMessage) return;
        
        emprestimosAtrasadosTableBody.innerHTML = ''; // Limpa tabela
        if (emprestimos.length === 0) {
            tabelaAtrasadosContainer.classList.add('hidden');
            noEmprestimosAtrasadosMessage.classList.remove('hidden');
            return;
        }
        
        tabelaAtrasadosContainer.classList.remove('hidden');
        noEmprestimosAtrasadosMessage.classList.add('hidden');

        emprestimos.forEach(emp => {
            const row = emprestimosAtrasadosTableBody.insertRow();
            const dataPrevista = emp.data_devolucao_prevista_iso ? new Date(emp.data_devolucao_prevista_iso).toLocaleDateString('pt-BR') : 'N/A';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${emp.livro_titulo || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${emp.cliente_nome_completo || emp.leitor_nome || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">${emp.cliente_email || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dataPrevista}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">${emp.dias_atraso || 0}</td>
            `;
        });
    }
    
    // --- Adicionar Listeners ---
    if(logoutButton) logoutButton.addEventListener('click', logout);

    // --- Inicialização ---
    const currentYearSpan = document.getElementById('currentYearAdminReports');
    if(currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    
    checkAdminLoginStatus();
});
