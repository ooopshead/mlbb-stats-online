import * as store from '../store.js';
import * as ui from '../ui.js';
import * as dataService from '../dataService.js';

export function initHistoryPage() {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;

    ui.initAutocomplete('#edit-match-form .hero-input');

    const opponentFilter = document.getElementById('history-opponent-filter');
    const typeFilter = document.getElementById('history-type-filter');
    const editModal = document.getElementById('edit-match-modal');
    // ... остальной код объявления переменных ...
    
    const exportBtn = document.getElementById('export-offline-data-btn');
    const importInput = document.getElementById('import-file-input');
    
    let allMatches = [];

    // ... (все функции рендеринга и обработчики модальных окон остаются без изменений)
    const populateHistoryFilters = () => { /* ... */ };
    const renderHistory = () => { /* ... */ };
    const openEditModal = (matchId) => { /* ... */ };
    historyContainer.addEventListener('click', e => { /* ... */ });
    // ...

    // --- НАЧАЛО ИЗМЕНЕНИЙ В ЛОГИКЕ ИМПОРТА/ЭКСПОРТА ---

    exportBtn.addEventListener('click', () => {
        const offlineMatches = JSON.parse(localStorage.getItem('mlbb_matches')) || [];
        if (offlineMatches.length === 0) {
            ui.showToast('В локальном хранилище (оффлайн-версии) нет данных для экспорта.', 'error');
            return;
        }
        
        const dataToExport = {
            matches: offlineMatches,
            team_info: JSON.parse(localStorage.getItem('mlbb_team_info')) || {},
            patches: JSON.parse(localStorage.getItem('mlbb_patches')) || [],
        };
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mlbb-stats-offline-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    importInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                // Проверяем, что в файле есть хоть какие-то данные
                if (!importedData || (!importedData.matches && !importedData.team_info && !importedData.patches)) {
                    throw new Error("Файл пуст или имеет некорректный формат.");
                }
                
                const matchesCount = importedData.matches?.length || 0;

                ui.showConfirm(`Вы уверены, что хотите импортировать ${matchesCount} матчей и перезаписать настройки команды и патчей?`, async () => {
                    ui.showToast('Начинаем импорт. Это может занять некоторое время...', 'info');
                    
                    // ИСПРАВЛЕНО: Вызываем новую универсальную функцию
                    const result = await dataService.importData(importedData);

                    if (result.success) {
                        ui.showToast(`Импорт завершен! Обработано ${matchesCount} матчей. Настройки обновлены.`, 'success');
                        // Перезагружаем страницу, чтобы все компоненты (например, на дашборде) обновили свои данные
                        window.location.reload(); 
                    } else {
                        ui.showToast(`Ошибка импорта: ${result.error.message}`, 'error');
                    }
                });

            } catch (error) {
                ui.showToast('Ошибка чтения файла: ' + error.message, 'error');
            } finally {
                importInput.value = '';
            }
        };
        reader.readAsText(file);
    });

    // ... (остальной код, включая loadPageData, без изменений)
    async function loadPageData() {
        historyContainer.innerHTML = '<div class="loading-spinner"></div>';
        allMatches = await dataService.getMatches();
        populateHistoryFilters();
        renderHistory();
    }

    loadPageData();
}