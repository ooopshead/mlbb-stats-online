import { supabase } from './supabaseClient.js';
import { initAddMatchPage } from './pages/addMatch.js';
import { initStatsPage } from './pages/stats.js';
import { initHistoryPage } from './pages/history.js';
import { initMatchupPage } from './pages/matchup.js';
import { initDashboardPage } from './pages/dashboard.js';
import { initPlannerPage } from './pages/planner.js';

// --- ГЛОБАЛЬНЫЙ КОД (ЗАПУСКАЕТСЯ НА ВСЕХ СТРАНИЦАХ) ---

// Проверка аутентификации
async function checkAuth() {
    // Не проверяем аутентификацию на странице логина, чтобы избежать бесконечного перенаправления
    if (window.location.pathname.endsWith('/login.html')) {
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        // Если сессии нет, перенаправляем на страницу входа
        window.location.href = 'index.html';
    }
}

// Добавляем кнопку выхода из аккаунта
function initLogoutButton() {
    // Предположим, что в каждом header есть пустой элемент для кнопки выхода
    // или можно добавить его в конец nav
    const nav = document.querySelector('header nav');
    if (nav) {
        const logoutButton = document.createElement('a');
        logoutButton.href = '#';
        logoutButton.textContent = 'Выйти';
        logoutButton.style.marginLeft = 'auto'; // Сдвигаем вправо
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
        nav.appendChild(logoutButton);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();

    // 1. Инициализация темы
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const toggleTheme = () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
    };
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
    }
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Добавляем кнопку "Выйти" на все страницы, кроме логина
    if (!window.location.pathname.endsWith('/login.html')) {
        initLogoutButton();
    }

    // 2. Инициализация логики для текущей страницы
    initAddMatchPage();
    initStatsPage();
    initHistoryPage();
    initMatchupPage();
    initDashboardPage();
    initPlannerPage();
});