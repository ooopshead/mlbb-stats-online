import { supabase } from './supabaseClient.js';
import { initAddMatchPage } from './pages/addMatch.js';
import { initStatsPage } from './pages/stats.js';
import { initHistoryPage } from './pages/history.js';
import { initMatchupPage } from './pages/matchup.js';
import { initDashboardPage } from './pages/dashboard.js';
import { initPlannerPage } from './pages/planner.js';
import { initDraftHelperPage } from './pages/draftHelper.js';

async function checkAuth() {
    // Получаем текущее имя файла
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'index.html' || currentPage === '') {
        return; // Не проверяем на странице входа
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        // ИСПРАВЛЕННЫЙ ПУТЬ
        window.location.href = 'index.html';
    }
}

function initLogoutButton() {
    const nav = document.querySelector('header nav');
    if (nav) {
        const logoutButton = document.createElement('a');
        logoutButton.href = '#';
        logoutButton.textContent = 'Выйти';
        logoutButton.style.marginLeft = 'auto';
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
             // ИСПРАВЛЕННЫЙ ПУТЬ
            window.location.href = 'index.html';
        });
        nav.appendChild(logoutButton);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();

    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    if (themeToggleBtn) {
        const toggleTheme = () => {
            body.classList.toggle('dark-mode');
            localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
        };
        if (localStorage.getItem('theme') === 'dark') {
            body.classList.add('dark-mode');
        }
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage !== 'index.html' && currentPage !== '') {
        initLogoutButton();
    }

    initAddMatchPage();
    initStatsPage();
    initHistoryPage();
    initMatchupPage();
    initDashboardPage();
    initPlannerPage();
initDraftHelperPage();
});