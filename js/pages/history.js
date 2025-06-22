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
    const editModalCloseBtn = document.getElementById('edit-modal-close-btn');
    const editForm = document.getElementById('edit-match-form');
    
    const exportBtn = document.getElementById('export-offline-data-btn');
    const importInput = document.getElementById('import-file-input');
    
    let allMatches = [];

    const populateHistoryFilters = () => {
        const opponentNames = [...new Set(allMatches.map(m => m.opponent_team).filter(Boolean))].sort();
        opponentFilter.innerHTML = '<option value="all">Все команды</option>';
        opponentNames.forEach(name => opponentFilter.add(new Option(name, name)));
    };

    const renderHistory = () => {
        let matchesToRender = [...allMatches];
        if (opponentFilter.value !== 'all') matchesToRender = matchesToRender.filter(m => m.opponent_team === opponentFilter.value);
        if (typeFilter.value !== 'all') matchesToRender = matchesToRender.filter(m => m.match_type === typeFilter.value);
        
        historyContainer.innerHTML = '';
        if (matchesToRender.length === 0) {
            historyContainer.innerHTML = '<div class="card empty-state"><p>Нет матчей по выбранным фильтрам. Добавьте свой первый матч или импортируйте данные.</p></div>';
            return;
        }

        const draftToHtml = (draft, isPick) => (draft || []).map(item => {
            const hero = store.getH(item);
            const phase = typeof item === 'object' ? `<span class="text-muted">(${item.phase})</span>` : '';
            const roleTag = isPick && item.role ? `<span class="hero-role-tag role-${item.role.toLowerCase()}">${item.role}</span>` : '';
            return `<li><img src="${ui.getHeroIconUrl(hero)}" class="hero-icon" alt=""> ${hero} ${phase} ${roleTag}</li>`;
        }).join('');

        matchesToRender.forEach(match => {
            const card = document.createElement('div');
            card.className = 'card match-card';
            const date = new Date(match.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const ourSide = match.our_team_side;
            const oppSide = ourSide === 'blue' ? 'red' : 'blue';
            const ourColumnHtml = `<div class="draft-column"><h2>Наша команда <span class="team-side-badge team-side-${ourSide}">${ourSide}</span></h2><div class="draft-list"><h3>Баны</h3><ul>${draftToHtml(match.bans?.our_team, false)}</ul><h3>Пики</h3><ul>${draftToHtml(match.picks?.our_team, true)}</ul></div></div>`;
            const oppColumnHtml = `<div class="draft-column"><h2>Соперник <span class="team-side-badge team-side-${oppSide}">${oppSide}</span></h2><div class="draft-list"><h3>Баны</h3><ul>${draftToHtml(match.bans?.opponent_team, false)}</ul><h3>Пики</h3><ul>${draftToHtml(match.picks?.opponent_team, true)}</ul></div></div>`;
            const notesHtml = match.notes ? `<div class="match-notes"><h4>Заметки:</h4><p>${match.notes.replace(/\n/g, '<br>')}</p></div>` : '';
            card.innerHTML = `<div class="card-header"><div class="opponent">vs ${match.opponent_team}</div><div class="result ${match.result === 'win' ? 'result-win' : 'result-loss'}">${match.result === 'win' ? 'Победа' : 'Поражение'}</div><div><button class="btn btn-icon edit-match-btn" data-match-id="${match.id}" title="Редактировать матч">✏️</button><button class="btn btn-icon delete-match-btn" data-match-id="${match.id}" title="Удалить матч">🗑️</button></div></div><div class="card-body">${ourSide === 'blue' ? ourColumnHtml + oppColumnHtml : oppColumnHtml + ourColumnHtml}</div>${notesHtml}<div class="meta" style="margin-top: 16px; border-top: 1px solid var(--border-light); padding-top: 16px;">${match.patch ? `Патч: ${match.patch} • ` : ''} ${match.match_type === 'tournament' ? '🏆 Турнир' : '⚔️ Скрим'} • ${date}</div>`;
            historyContainer.appendChild(card);
        });
    };
    
    const openEditModal = async (matchId) => {
        const match = allMatches.find(m => m.id == matchId);
        if (!match) { ui.showToast('Матч не найден!', 'error'); return; }

        document.getElementById('edit-match-id').value = match.id;
        const oppSelect = document.getElementById('edit-opponent-team-select');
        oppSelect.innerHTML = '';
        const opponentNames = [...new Set(allMatches.map(m => m.opponent_team).filter(Boolean))].sort();
        opponentNames.forEach(name => oppSelect.add(new Option(name, name)));
        oppSelect.value = match.opponent_team;

        const { patches } = await dataService.getUserSettings();
        const patchSelect = document.getElementById('edit-match_patch');
        patchSelect.innerHTML = '';
        patches.forEach(p => patchSelect.add(new Option(p, p)));
        patchSelect.value = match.patch || "";

        document.getElementById('edit-match_type').value = match.match_type;
        document.querySelector(`input[name="edit_our_team_side"][value="${match.our_team_side}"]`).checked = true;
        document.querySelector(`input[name="edit_result"][value="${match.result}"]`).checked = true;
        document.getElementById('edit-match-notes').value = match.notes;

        const populateDraftSide = (side, draftData) => {
            const banInputs = document.querySelectorAll(`.edit-${side}-ban`);
            banInputs.forEach(i => i.value = '');
            (draftData.bans || []).forEach((ban, i) => { if (banInputs[i]) banInputs[i].value = store.getH(ban); });

            const pickInputs = document.querySelectorAll(`.edit-${side}-pick`);
            pickInputs.forEach(i => i.value = '');
            const roleSelects = document.querySelectorAll(`.edit-${side}-pick-role`);
            roleSelects.forEach(s => s.value = '');
            (draftData.picks || []).forEach((pick, i) => {
                if (pickInputs[i]) {
                    pickInputs[i].value = store.getH(pick);
                    roleSelects[i].value = pick.role || "";
                }
            });
        };

        populateDraftSide('blue', { bans: [], picks: [] });
        populateDraftSide('red', { bans: [], picks: [] });
        const ourSide = match.our_team_side;
        const oppSide = ourSide === 'blue' ? 'red' : 'blue';
        populateDraftSide(ourSide, { bans: match.bans?.our_team, picks: match.picks?.our_team });
        populateDraftSide(oppSide, { bans: match.bans?.opponent_team, picks: match.picks?.opponent_team });

        editModal.style.display = 'flex';
    };

    historyContainer.addEventListener('click', e => {
        const editBtn = e.target.closest('.edit-match-btn');
        if (editBtn) {
            openEditModal(editBtn.dataset.matchId);
            return;
        }

        const deleteBtn = e.target.closest('.delete-match-btn');
        if (deleteBtn) {
            const matchId = deleteBtn.dataset.matchId;
            ui.showConfirm('Вы уверены, что хотите удалить этот матч?', async () => {
                const success = await dataService.deleteMatch(matchId);
                if (success) {
                    ui.showToast('Матч удален.', 'success');
                    await loadPageData();
                } else {
                    ui.showToast('Ошибка при удалении.', 'error');
                }
            });
        }
    });

    editModalCloseBtn.addEventListener('click', () => editModal.style.display = 'none');
    editModal.addEventListener('click', e => { if (e.target === editModal) editModal.style.display = 'none' });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const matchId = document.getElementById('edit-match-id').value;
        const sideInput = document.querySelector('input[name="edit_our_team_side"]:checked');
        if (!sideInput) { ui.showToast('Выберите сторону вашей команды.', 'error'); return; }
        const ourSide = sideInput.value;

        const getPickData = (side) => Array.from(document.querySelectorAll(`.edit-${side}-pick`)).map((heroInput, i) => ({ hero: heroInput.value, role: document.querySelectorAll(`.edit-${side}-pick-role`)[i].value || null, phase: `P${i + 1}` })).filter(p => p.hero);
        const getBanData = (side) => Array.from(document.querySelectorAll(`.edit-${side}-ban`)).map((input, i) => ({ hero: input.value, phase: `B${i + 1}` })).filter(item => item.hero);

        const originalMatch = allMatches.find(m => m.id == matchId);
        const updatedData = {
            ...originalMatch,
            opponent_team: document.getElementById('edit-opponent-team-select').value,
            match_type: document.getElementById('edit-match_type').value,
            patch: document.getElementById('edit-match_patch').value,
            our_team_side: ourSide,
            result: document.querySelector('input[name="edit_result"]:checked').value,
            notes: document.getElementById('edit-match-notes').value.trim(),
            bans: { our_team: getBanData(ourSide), opponent_team: getBanData(ourSide === 'blue' ? 'red' : 'blue') },
            picks: { our_team: getPickData(ourSide), opponent_team: getPickData(ourSide === 'blue' ? 'red' : 'blue') }
        };

        const result = await dataService.updateMatch(matchId, updatedData);
        if (result) {
            ui.showToast('Матч успешно обновлен!', 'success');
            editModal.style.display = 'none';
            await loadPageData();
        } else {
            ui.showToast('Ошибка при обновлении.', 'error');
        }
    });
    
    opponentFilter.addEventListener('change', renderHistory);
    typeFilter.addEventListener('change', renderHistory);

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
                if (!importedData || (!importedData.matches && !importedData.team_info && !importedData.patches)) {
                    throw new Error("Файл пуст или имеет некорректный формат.");
                }
                const matchesCount = importedData.matches?.length || 0;
                ui.showConfirm(`Вы уверены, что хотите импортировать ${matchesCount} матчей и перезаписать настройки?`, async () => {
                    ui.showToast('Начинаем импорт. Это может занять некоторое время...', 'info');
                    const result = await dataService.importData(importedData);
                    if (result.success) {
                        ui.showToast(`Импорт завершен! Страница будет перезагружена.`, 'success');
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        ui.showToast(`Ошибка импорта: ${result.error?.message}`, 'error');
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

    async function loadPageData() {
        historyContainer.innerHTML = '<div class="loading-spinner"></div>';
        allMatches = await dataService.getMatches();
        populateHistoryFilters();
        renderHistory();
    }

    loadPageData();
}