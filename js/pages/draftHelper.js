// --- ФАЙЛ: js/pages/draftHelper.js ---

import * as ui from '../ui.js';
import * as dataService from '../dataService.js';
import * as store from '../store.js';

// Правильная последовательность фаз драфта
const DRAFT_SEQUENCE = [
    { side: 'blue', type: 'ban', key: 'B1' },   // Ban Phase 1
    { side: 'red', type: 'ban', key: 'B1' },
    { side: 'blue', type: 'ban', key: 'B2' },
    { side: 'red', type: 'ban', key: 'B2' },
    { side: 'blue', type: 'ban', key: 'B3' },
    { side: 'red', type: 'ban', key: 'B3' },
    { side: 'blue', type: 'pick', key: 'P1' },  // Pick Phase 1
    { side: 'red', type: 'pick', key: 'P1' },
    { side: 'red', type: 'pick', key: 'P2' },
    { side: 'blue', type: 'pick', key: 'P2' },
    { side: 'blue', type: 'pick', key: 'P3' },
    { side: 'red', type: 'pick', key: 'P3' },
    { side: 'red', type: 'ban', key: 'B4' },    // Ban Phase 2
    { side: 'blue', type: 'ban', key: 'B4' },
    { side: 'red', type: 'ban', key: 'B5' },
    { side: 'blue', type: 'ban', key: 'B5' },
    { side: 'red', type: 'pick', key: 'P4' },   // Pick Phase 2
    { side: 'blue', type: 'pick', key: 'P4' },
    { side: 'blue', type: 'pick', key: 'P5' },
    { side: 'red', type: 'pick', key: 'P5' },
];

// [ИСПРАВЛЕНО] Последовательность для планирования НАШИХ ходов
const OUR_DRAFT_PHASES_IN_ORDER = [
    { key: 'our_B1', title: 'Наш Бан 1 (Ход 1, 3 или 5)' }, 
    { key: 'our_B2', title: 'Наш Бан 2 (Ход 1, 3 или 5)' }, 
    { key: 'our_B3', title: 'Наш Бан 3 (Ход 1, 3 или 5)' },
    { key: 'our_P1', title: 'Наш Пик 1 (Ход 7 или 8)' }, 
    { key: 'our_P2', title: 'Наш Пик 2 (Ход 9 или 10)' },
    { key: 'our_P3', title: 'Наш Пик 3 (Ход 11 или 12)' },
    { key: 'our_B4', title: 'Наш Бан 4 (Ход 13 или 14)' }, 
    { key: 'our_B5', title: 'Наш Бан 5 (Ход 15 или 16)' },
    { key: 'our_P4', title: 'Наш Пик 4 (Ход 17 или 18)' }, 
    { key: 'our_P5', title: 'Наш Пик 5 (Ход 19 или 20)' },
];

// Глобальные переменные состояния для страницы
let allMatches = [];
let allStrategies = [];
let currentOpponent = null;
let currentStrategyId = null;
let currentStrategy = null;
let isEditMode = false;
let interactiveHelperState = {};

// DOM Элементы
let opponentSelect, strategySelect, newStrategyBtn, editStrategyBtn, deleteStrategyBtn, launchHelperBtn;
let builderContainer, displayContainer, placeholderContainer;
let strategyNameInput, rulesContainer, saveStrategyBtn, cancelStrategyBtn;
let helperModal, helperModalCloseBtn, helperTitle, blueSlots, redSlots, suggestionsContent, liveAnalysisContent, suggestionPhaseTitle;

// --- ИНИЦИАЛИЗАЦИЯ И УПРАВЛЕНИЕ UI ---

function getDOMElements() {
    opponentSelect = document.getElementById('helper-opponent-select');
    strategySelect = document.getElementById('helper-strategy-select');
    newStrategyBtn = document.getElementById('new-strategy-btn');
    editStrategyBtn = document.getElementById('edit-strategy-btn');
    deleteStrategyBtn = document.getElementById('delete-strategy-btn');
    launchHelperBtn = document.getElementById('launch-helper-btn');
    builderContainer = document.getElementById('strategy-builder-container');
    displayContainer = document.getElementById('strategy-display-container');
    placeholderContainer = document.getElementById('helper-placeholder');
    strategyNameInput = document.getElementById('strategy-name-input');
    rulesContainer = document.getElementById('strategy-rules-container');
    saveStrategyBtn = document.getElementById('save-strategy-btn');
    cancelStrategyBtn = document.getElementById('cancel-strategy-btn');
    helperModal = document.getElementById('interactive-helper-modal');
    helperModalCloseBtn = document.getElementById('interactive-helper-close-btn');
    helperTitle = document.getElementById('interactive-helper-title');
    blueSlots = document.getElementById('helper-blue-slots');
    redSlots = document.getElementById('helper-red-slots');
    suggestionsContent = document.getElementById('suggestions-content');
    liveAnalysisContent = document.getElementById('live-analysis-content');
    suggestionPhaseTitle = document.getElementById('suggestion-phase-title');
}

function updateButtonsState() {
    const opponentSelected = !!currentOpponent;
    const strategySelected = !!currentStrategyId;
    newStrategyBtn.disabled = !opponentSelected;
    editStrategyBtn.disabled = !strategySelected;
    deleteStrategyBtn.disabled = !strategySelected;
    launchHelperBtn.disabled = !strategySelected;
}

function showView(view) {
    builderContainer.style.display = view === 'builder' ? 'block' : 'none';
    displayContainer.style.display = view === 'display' ? 'block' : 'none';
    placeholderContainer.style.display = view === 'placeholder' ? 'flex' : 'none';
}

// --- ЗАГРУЗКА И ОТОБРАЖЕНИЕ ДАННЫХ ---

async function loadInitialData() {
    [allMatches, allStrategies] = await Promise.all([
        dataService.getMatches(),
        dataService.getStrategies()
    ]);
    const opponentNames = [...new Set(allMatches.map(m => m.opponent_team).filter(Boolean))].sort();
    opponentSelect.innerHTML = '<option value="">-- Выберите команду --</option>';
    opponentNames.forEach(name => opponentSelect.add(new Option(name, name)));
}

function populateStrategySelect() {
    const strategiesForOpponent = allStrategies.filter(s => s.opponent_name === currentOpponent);
    strategySelect.innerHTML = '';
    if (strategiesForOpponent.length > 0) {
        strategySelect.disabled = false;
        strategySelect.innerHTML = '<option value="">-- Выберите стратегию --</option>';
        strategiesForOpponent.forEach(s => strategySelect.add(new Option(s.strategy_name, s.id)));
    } else {
        strategySelect.disabled = true;
        strategySelect.innerHTML = '<option value="">-- Нет стратегий для этой команды --</option>';
    }
}

// --- КОНСТРУКТОР СТРАТЕГИЙ (Builder) ---

// [ИСПРАВЛЕНО] Эта функция теперь генерирует карточки в правильном порядке
function renderStrategyBuilder(strategy = null) {
    isEditMode = !!strategy;
    document.getElementById('strategy-builder-title').textContent = isEditMode ? `Редактирование: ${strategy.strategy_name}` : `Новая стратегия для: ${currentOpponent}`;
    strategyNameInput.value = isEditMode ? strategy.strategy_name : '';
    rulesContainer.innerHTML = '';

    // Группируем баны и пики для удобства отображения
    const bans_phase1 = OUR_DRAFT_PHASES_IN_ORDER.slice(0, 3);
    const picks_phase1 = OUR_DRAFT_PHASES_IN_ORDER.slice(3, 6);
    const bans_phase2 = OUR_DRAFT_PHASES_IN_ORDER.slice(6, 8);
    const picks_phase2 = OUR_DRAFT_PHASES_IN_ORDER.slice(8, 10);

    const createPhaseCardHTML = (phase) => {
        const phaseData = (strategy && strategy.strategy_data[phase.key]) ? strategy.strategy_data[phase.key] : { priorities: [''], notes: '' };
        const isPick = phase.key.includes('_P');
        let prioritiesHtml = (phaseData.priorities || ['']).map((hero, index) => `
            <div class="priority-item"><span class="priority-number">${index + 1}.</span><input type="text" class="hero-input" value="${hero || ''}" placeholder="Имя героя"><button type="button" class="remove-priority-btn" title="Удалить приоритет">&times;</button></div>`).join('');
        
        return `
            <div class="strategy-phase-card ${isPick ? 'pick' : 'ban'}" data-phase-key="${phase.key}">
                <h4><span class="phase-name">${phase.title.split(' (')[0]}</span></h4>
                <div class="priority-list-container">${prioritiesHtml}</div>
                <div class="add-priority-btn-container"><button type="button" class="btn add-priority-btn">+ Добавить вариант</button></div>
                <hr>
                <textarea class="strategy-notes" placeholder="Заметки для этой фазы...">${phaseData.notes || ''}</textarea>
            </div>
        `;
    };

    // Собираем весь HTML для конструктора
    rulesContainer.innerHTML = `
        <div class="phase-group">
            <h3>Первая фаза банов</h3>
            ${bans_phase1.map(createPhaseCardHTML).join('')}
        </div>
        <div class="phase-group">
            <h3>Первая фаза пиков</h3>
            ${picks_phase1.map(createPhaseCardHTML).join('')}
        </div>
        <div class="phase-group">
            <h3>Вторая фаза банов</h3>
            ${bans_phase2.map(createPhaseCardHTML).join('')}
        </div>
        <div class="phase-group">
            <h3>Вторая фаза пиков</h3>
            ${picks_phase2.map(createPhaseCardHTML).join('')}
        </div>
    `;
    
    ui.initAutocomplete('.strategy-phase-card .hero-input');
    showView('builder');
}

// --- ОТОБРАЖЕНИЕ СТРАТЕГИИ (Display) ---

// [ИСПРАВЛЕНО] Эта функция теперь отображает карточки в правильном порядке
function renderStrategyDisplay(strategy) {
    if (!strategy) { showView('placeholder'); return; }
    const { strategy_name, strategy_data } = strategy;
    
    const createDisplayCardHTML = (phase) => {
        const phaseData = strategy_data[phase.key];
        if (!phaseData) return '';
        const isPick = phase.key.includes('_P');
        return `
            <div class="strategy-phase-card ${isPick ? 'pick' : 'ban'}">
                <h4><span class="phase-name">${phase.title.split(' (')[0]}</span></h4>
                <div class="priority-list-container">
                    ${(phaseData.priorities || []).map((hero, index) => `<div class="priority-item"><span class="priority-number">${index + 1}.</span><div>${hero || '<i>Пусто</i>'}</div></div>`).join('')}
                    ${phaseData.notes ? `<div class="match-notes" style="margin-top: 12px; padding: 12px;"><h4>Заметка:</h4><p>${phaseData.notes.replace(/\n/g, '<br>')}</p></div>` : ''}
                </div>
            </div>
        `;
    };

    const bans_phase1 = OUR_DRAFT_PHASES_IN_ORDER.slice(0, 3);
    const picks_phase1 = OUR_DRAFT_PHASES_IN_ORDER.slice(3, 6);
    const bans_phase2 = OUR_DRAFT_PHASES_IN_ORDER.slice(6, 8);
    const picks_phase2 = OUR_DRAFT_PHASES_IN_ORDER.slice(8, 10);

    displayContainer.innerHTML = `
        <h2>${strategy_name}</h2>
        <hr>
        <div class="strategy-rules-grid">
            <div class="phase-group"><h3>Первая фаза банов</h3>${bans_phase1.map(createDisplayCardHTML).join('')}</div>
            <div class="phase-group"><h3>Первая фаза пиков</h3>${picks_phase1.map(createDisplayCardHTML).join('')}</div>
            <div class="phase-group"><h3>Вторая фаза банов</h3>${bans_phase2.map(createDisplayCardHTML).join('')}</div>
            <div class="phase-group"><h3>Вторая фаза пиков</h3>${picks_phase2.map(createDisplayCardHTML).join('')}</div>
        </div>`;

    showView('display');
}


// --- ИНТЕРАКТИВНЫЙ ПОМОЩНИК (Interactive Helper) ---

function launchInteractiveHelper() {
    if (!currentStrategy) return;
    helperTitle.textContent = `Помощник: ${currentStrategy.strategy_name} vs ${currentOpponent}`;
    
    interactiveHelperState = {
        currentIndex: 0,
        ourSide: document.querySelector('input[name="helper_our_team_side"]:checked')?.value || 'blue',
        draft: {},
        bans: { blue: [], red: [] },
        picks: { blue: [], red: [] },
    };

    blueSlots.innerHTML = '';
    redSlots.innerHTML = '';
    for(let i=1; i<=5; i++){
        blueSlots.innerHTML += `<div class="draft-slot ban" data-side="blue" data-phase="B${i}"></div>`;
        redSlots.innerHTML += `<div class="draft-slot ban" data-side="red" data-phase="B${i}"></div>`;
    }
    for(let i=1; i<=5; i++){
         blueSlots.innerHTML += `<div class="draft-slot pick" data-side="blue" data-phase="P${i}"></div>`;
         redSlots.innerHTML += `<div class="draft-slot pick" data-side="red" data-phase="P${i}"></div>`;
    }

    document.querySelectorAll('.draft-slot').forEach(slot => {
        slot.innerHTML = `<span class="phase-label">${slot.dataset.phase}</span><div class="hero-input-wrapper"><img class="hero-icon" src=""><input type="text" class="hero-input" autocomplete="off"></div><div class="hero-display"><img class="hero-icon" src=""><span></span></div>`;
        slot.querySelector('input').addEventListener('change', handleHeroSelection);
    });
    
    ui.initAutocomplete('.draft-slot .hero-input');
    helperModal.style.display = 'flex';
    updateHelperUI();
}

function updateHelperUI() {
    const state = interactiveHelperState;
    const isFinished = state.currentIndex >= DRAFT_SEQUENCE.length;
    
    document.querySelectorAll('.draft-slot.active').forEach(el => el.classList.remove('active'));

    if (isFinished) {
        suggestionPhaseTitle.textContent = "Драфт завершен";
        suggestionsContent.innerHTML = '<p class="text-muted">Драфт окончен. Можете закрыть окно.</p>';
        return;
    }

    const currentTurn = DRAFT_SEQUENCE[state.currentIndex];
    const { side, type, key } = currentTurn;
    const slot = document.querySelector(`.draft-slot[data-side="${side}"][data-phase="${key}"]`);

    if (slot) slot.classList.add('active');

    const isOurTurn = side === state.ourSide;
    const turnType = type === 'ban' ? 'Бан' : 'Пик';
    suggestionPhaseTitle.textContent = `Ход ${state.currentIndex + 1}: ${side === 'blue' ? 'Синие' : 'Красные'} - ${turnType} ${key}`;
    
    if (isOurTurn) generateSuggestions();
    else suggestionsContent.innerHTML = '<p class="text-muted">Ожидание выбора соперника...</p>';
    
    updateLiveAnalysis();
}

function handleHeroSelection(event) {
    const input = event.target;
    const heroName = input.value.trim();
    const slot = input.closest('.draft-slot');
    
    if (!heroName || !store.heroes.map(h => h.toLowerCase()).includes(heroName.toLowerCase())) {
        input.value = ''; return;
    }

    const correctCasedHeroName = store.heroes.find(h => h.toLowerCase() === heroName.toLowerCase());
    const state = interactiveHelperState;
    const allTakenHeroes = [...Object.values(state.bans.blue), ...Object.values(state.bans.red), ...Object.values(state.picks.blue), ...Object.values(state.picks.red)];
    
    if (allTakenHeroes.includes(correctCasedHeroName)) {
        ui.showToast(`Герой ${correctCasedHeroName} уже в драфте!`, 'error');
        input.value = ''; return;
    }
    
    const currentTurn = DRAFT_SEQUENCE[state.currentIndex];
    const { side, type, key } = currentTurn;

    state.draft[`${side}_${key}`] = correctCasedHeroName;
    state[type + 's'][side].push(correctCasedHeroName);
    state.currentIndex++;

    slot.classList.add('filled');
    const display = slot.querySelector('.hero-display');
    display.querySelector('.hero-icon').src = ui.getHeroIconUrl(correctCasedHeroName);
    display.querySelector('span').textContent = correctCasedHeroName;

    updateHelperUI();
}

function generateSuggestions() {
    const state = interactiveHelperState;
    const currentTurn = DRAFT_SEQUENCE[state.currentIndex];
    const ourTeamPicksCount = state.picks[state.ourSide].length;
    const ourTeamBansCount = state.bans[state.ourSide].length;

    // Определяем ключ для стратегии. Например, если это наш 3-й пик, ключ будет 'our_P3'
    const keyNumber = currentTurn.type === 'pick' ? ourTeamPicksCount + 1 : ourTeamBansCount + 1;
    const phaseKey = `our_${currentTurn.key[0]}${keyNumber}`;
    
    const strategyPhase = currentStrategy.strategy_data[phaseKey];
    if (!strategyPhase) {
        suggestionsContent.innerHTML = '<p class="text-muted">Нет данных по стратегии для этой фазы.</p>';
        return;
    }

    const allTakenHeroes = [...Object.values(state.bans.blue), ...Object.values(state.bans.red), ...Object.values(state.picks.blue), ...Object.values(state.picks.red)];
    let suggestions = [];

    (strategyPhase.priorities || []).forEach(hero => {
        if (hero && !allTakenHeroes.includes(hero)) {
            suggestions.push({ hero, reason: 'priority', text: 'План' });
        }
    });

    if (suggestions.length === 0) {
        suggestionsContent.innerHTML = '<p class="text-muted">Все герои из плана недоступны. Выберите героя вручную.</p>';
    } else {
        suggestionsContent.innerHTML = `<ul>${suggestions.map(s => `<li><div class="suggestion-hero-info"><img src="${ui.getHeroIconUrl(s.hero)}" class="hero-icon"> ${s.hero}</div><span class="suggestion-reason ${s.reason}">${s.text}</span></li>`).join('')}</ul>`;
    }
    if (strategyPhase.notes) {
        suggestionsContent.innerHTML += `<div class="match-notes" style="margin-top:16px; padding: 12px;"><h4>Заметка к фазе:</h4><p>${strategyPhase.notes}</p></div>`;
    }
}

function updateLiveAnalysis() {
    liveAnalysisContent.innerHTML = '<p class="text-muted">Аналитика появится по ходу драфта.</p>';
}

// --- ОБРАБОТЧИКИ СОБЫТИЙ И CRUD ---

function handleOpponentChange() {
    currentOpponent = opponentSelect.value;
    currentStrategyId = null; currentStrategy = null;
    strategySelect.value = '';
    populateStrategySelect();
    updateButtonsState();
    showView('placeholder');
    placeholderContainer.querySelector('p').textContent = currentOpponent ? 'Выберите существующую стратегию или создайте новую.' : 'Выберите команду соперника, чтобы создать или загрузить стратегию драфта.';
}

function handleStrategyChange() {
    currentStrategyId = strategySelect.value;
    if (currentStrategyId) {
        currentStrategy = allStrategies.find(s => s.id === currentStrategyId);
        renderStrategyDisplay(currentStrategy);
    } else {
        currentStrategy = null;
        showView('placeholder');
        placeholderContainer.querySelector('p').textContent = 'Выберите существующую стратегию или создайте новую.';
    }
    updateButtonsState();
}

async function handleSaveStrategy() {
    const name = strategyNameInput.value.trim();
    if (!name) { ui.showToast('Введите название стратегии!', 'error'); return; }

    const strategyData = {};
    document.querySelectorAll('.strategy-phase-card').forEach(card => {
        const phaseKey = card.dataset.phaseKey;
        const priorities = Array.from(card.querySelectorAll('.priority-item input')).map(input => input.value.trim());
        const notes = card.querySelector('.strategy-notes').value.trim();
        strategyData[phaseKey] = { priorities, notes };
    });

    const strategyToSave = { id: isEditMode ? currentStrategyId : undefined, opponent_name: currentOpponent, strategy_name: name, strategy_data: strategyData };
    const savedStrategy = await dataService.saveStrategy(strategyToSave);
    if (savedStrategy) {
        ui.showToast('Стратегия успешно сохранена!', 'success');
        await loadInitialData();
        opponentSelect.value = savedStrategy.opponent_name;
        handleOpponentChange();
        strategySelect.value = savedStrategy.id;
        handleStrategyChange();
    } else { ui.showToast('Ошибка при сохранении стратегии.', 'error'); }
}

async function handleDeleteStrategy() {
    if (!currentStrategyId) return;
    ui.showConfirm('Вы уверены, что хотите удалить эту стратегию?', async () => {
        const success = await dataService.deleteStrategy(currentStrategyId);
        if (success) {
            ui.showToast('Стратегия удалена.', 'success');
            currentStrategyId = null; currentStrategy = null;
            await loadInitialData();
            handleOpponentChange();
        } else { ui.showToast('Ошибка при удалении.', 'error'); }
    });
}

function handleBuilderEvents(e) {
    const addBtn = e.target.closest('.add-priority-btn');
    if (addBtn) {
        const container = addBtn.closest('.strategy-phase-card').querySelector('.priority-list-container');
        const newIndex = container.children.length + 1;
        const newItem = document.createElement('div');
        newItem.className = 'priority-item';
        newItem.innerHTML = `<span class="priority-number">${newIndex}.</span><input type="text" class="hero-input" placeholder="Имя героя"><button type="button" class="remove-priority-btn" title="Удалить приоритет">&times;</button>`;
        container.appendChild(newItem);
        newItem.querySelector('input').focus();
        ui.initAutocomplete('.strategy-phase-card .hero-input');
        return;
    }
    const removeBtn = e.target.closest('.remove-priority-btn');
    if (removeBtn) {
        const item = removeBtn.closest('.priority-item');
        const container = item.parentElement;
        item.remove();
        Array.from(container.children).forEach((child, index) => { child.querySelector('.priority-number').textContent = `${index + 1}.`; });
    }
}

export async function initDraftHelperPage() {
    if (!document.getElementById('helper-opponent-select')) return;
    getDOMElements();
    showView('placeholder');
    await loadInitialData();
    opponentSelect.addEventListener('change', handleOpponentChange);
    strategySelect.addEventListener('change', handleStrategyChange);
    newStrategyBtn.addEventListener('click', () => renderStrategyBuilder());
    editStrategyBtn.addEventListener('click', () => { if (currentStrategy) renderStrategyBuilder(currentStrategy); });
    deleteStrategyBtn.addEventListener('click', handleDeleteStrategy);
    saveStrategyBtn.addEventListener('click', handleSaveStrategy);
    cancelStrategyBtn.addEventListener('click', () => { if(currentStrategyId) handleStrategyChange(); else handleOpponentChange(); });
    rulesContainer.addEventListener('click', handleBuilderEvents);
    launchHelperBtn.addEventListener('click', launchInteractiveHelper);
    helperModalCloseBtn.addEventListener('click', () => helperModal.style.display = 'none');
    helperModal.addEventListener('click', e => { if (e.target === helperModal) helperModal.style.display = 'none'; });
    document.querySelectorAll('input[name="helper_our_team_side"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (interactiveHelperState.ourSide) {
                interactiveHelperState.ourSide = e.target.value;
                updateHelperUI();
            }
        });
    });
}