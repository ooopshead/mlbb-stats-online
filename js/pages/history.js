import * as store from '../store.js';
import * as ui from '../ui.js';
import * as dataService from '../dataService.js';

export function initHistoryPage() {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;

    ui.initAutocomplete('#edit-match-form .hero-input');

    // DOM элементы
    const opponentFilter = document.getElementById('history-opponent-filter');
    const typeFilter = document.getElementById('history-type-filter');
    const editModal = document.getElementById('edit-match-modal');
    const editModalCloseBtn = document.getElementById('edit-modal-close-btn');
    const editForm = document.getElementById('edit-match-form');
    
    const analysisModal = document.getElementById('analysis-modal');
    const analysisModalCloseBtn = document.getElementById('analysis-modal-close-btn');
    const analysisModalTitle = document.getElementById('analysis-modal-title');
    const analysisKeyFactors = document.getElementById('analysis-key-factors');
    const analysisVerdict = document.getElementById('analysis-verdict');
    const analysisOurTeam = document.getElementById('analysis-our-team');
    const analysisOpponentTeam = document.getElementById('analysis-opponent-team');
    
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
            card.innerHTML = `<div class="card-header"><div class="opponent">vs ${match.opponent_team}</div><div class="result ${match.result === 'win' ? 'result-win' : 'result-loss'}">${match.result === 'win' ? 'Победа' : 'Поражение'}</div><div><button class="btn btn-icon edit-match-btn" data-match-id="${match.id}" title="Редактировать матч">✏️</button><button class="btn btn-icon delete-match-btn" data-match-id="${match.id}" title="Удалить матч">🗑️</button><button class="btn btn-icon analysis-match-btn" data-match-id="${match.id}" title="Анализ драфта">🔬</button></div></div><div class="card-body">${ourSide === 'blue' ? ourColumnHtml + oppColumnHtml : oppColumnHtml + ourColumnHtml}</div>${notesHtml}<div class="meta" style="margin-top: 16px; border-top: 1px solid var(--border-light); padding-top: 16px;">${match.patch ? `Патч: ${match.patch} • ` : ''} ${match.match_type === 'tournament' ? '🏆 Турнир' : '⚔️ Скрим'} • ${date}</div>`;
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
        patches.sort().reverse().forEach(p => patchSelect.add(new Option(p, p)));
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

    const openDraftAnalysisModal = (matchId) => {
        const match = allMatches.find(m => m.id == matchId);
        if (!match) return;

        analysisModalTitle.textContent = `Анализ матча против ${match.opponent_team}`;
        
        const getOverallHeroStats = (heroName, matches) => {
            let wins = 0, games = 0;
            matches.forEach(m => {
                const ourPicks = (m.picks?.our_team || []).map(p => p.hero);
                const oppPicks = (m.picks?.opponent_team || []).map(p => p.hero);

                if (ourPicks.includes(heroName)) {
                    games++;
                    if (m.result === 'win') wins++;
                } else if (oppPicks.includes(heroName)) {
                    games++;
                    if (m.result === 'loss') wins++;
                }
            });
            return { games, wr: games > 0 ? (wins / games * 100) : 0 };
        };

        const getMatchupStats = (povHero, enemyHero, matches) => {
            let wins = 0, games = 0;
            matches.forEach(m => {
                const ourPicks = (m.picks?.our_team || []).map(p => p.hero);
                const oppPicks = (m.picks?.opponent_team || []).map(p => p.hero);
                if (ourPicks.includes(povHero) && oppPicks.includes(enemyHero)) {
                    games++;
                    if (m.result === 'win') wins++;
                } else if (oppPicks.includes(povHero) && ourPicks.includes(enemyHero)) {
                    games++;
                    if (m.result === 'loss') wins++;
                }
            });
            return { games, wr: games > 0 ? (wins / games * 100) : 0 };
        };

        const getSynergyStats = (hero1, hero2, teamType, matches) => {
            let wins = 0, games = 0;
            matches.forEach(m => {
                const teamPicks = (teamType === 'our_team' ? m.picks?.our_team : m.picks?.opponent_team) || [];
                if (teamPicks.map(p => p.hero).includes(hero1) && teamPicks.map(p => p.hero).includes(hero2)) {
                    games++;
                    if ((teamType === 'our_team' && m.result === 'win') || (teamType === 'opponent_team' && m.result === 'loss')) {
                        wins++;
                    }
                }
            });
            return { games, wr: games > 0 ? (wins / games * 100) : 0 };
        };

        const ourPicks = (match.picks?.our_team || []);
        const oppPicks = (match.picks?.opponent_team || []);
        
        const ourPicksWithStats = ourPicks.map(p => ({ ...p, ...getOverallHeroStats(p.hero, allMatches) }));
        const oppPicksWithStats = oppPicks.map(p => ({ ...p, ...getOverallHeroStats(p.hero, allMatches) }));
        
        const ourMVP = [...ourPicksWithStats].sort((a,b) => b.wr - a.wr)[0] || { hero: '?', wr: 0, games: 0 };
        const mainThreat = [...oppPicksWithStats].sort((a,b) => b.wr - a.wr)[0] || { hero: '?', wr: 0, games: 0 };
        
        let allOurSynergies = [];
        for (let i = 0; i < ourPicks.length; i++) {
            for (let j = i + 1; j < ourPicks.length; j++) {
                allOurSynergies.push({ heroes: [ourPicks[i].hero, ourPicks[j].hero], ...getSynergyStats(ourPicks[i].hero, ourPicks[j].hero, 'our_team', allMatches) });
            }
        }
        const bestSynergy = [...allOurSynergies].filter(s => s.games > 0).sort((a,b) => b.wr - a.wr)[0] || { heroes: ['?','?'], wr: 0, games: 0 };

        analysisKeyFactors.innerHTML = `
            <div class="key-factor-card">
                <h4>MVP-пик (общий)</h4>
                <div class="hero-cell"><img src="${ui.getHeroIconUrl(ourMVP.hero)}" class="hero-icon" /> ${ourMVP.hero}</div>
                <div class="stat">Общий WR: <b class="stat-value ${ourMVP.wr >= 50 ? 'win' : 'loss'}">${ourMVP.wr.toFixed(1)}%</b> (${ourMVP.games} игр)</div>
            </div>
            <div class="key-factor-card">
                <h4>Главная угроза (общий)</h4>
                <div class="hero-cell"><img src="${ui.getHeroIconUrl(mainThreat.hero)}" class="hero-icon" /> ${mainThreat.hero}</div>
                <div class="stat">Общий WR: <b class="stat-value ${mainThreat.wr >= 50 ? 'win' : 'loss'}">${mainThreat.wr.toFixed(1)}%</b> (${mainThreat.games} игр)</div>
            </div>
            <div class="key-factor-card">
                <h4>Лучшая связка (в вашей команде)</h4>
                <div class="hero-cell"><img src="${ui.getHeroIconUrl(bestSynergy.heroes[0])}" class="hero-icon" />+<img src="${ui.getHeroIconUrl(bestSynergy.heroes[1])}" class="hero-icon" /></div>
                <div class="stat">Ваш WR: <b class="stat-value ${bestSynergy.wr >= 50 ? 'win' : 'loss'}">${bestSynergy.wr.toFixed(1)}%</b> (${bestSynergy.games} игр)</div>
            </div>
        `;

        const calculateDraftRatings = (teamPicks, enemyPicks, teamType) => {
            if (teamPicks.length === 0) return { heroScore: 0, synergyScore: 0, matchupScore: 0, overallRating: 0 };
            
            const heroScore = teamPicks.reduce((acc, p) => acc + p.wr, 0) / teamPicks.length;

            let allSynergies = [];
            for (let i = 0; i < teamPicks.length; i++) {
                for (let j = i + 1; j < teamPicks.length; j++) {
                    allSynergies.push(getSynergyStats(teamPicks[i].hero, teamPicks[j].hero, teamType, allMatches));
                }
            }
            const synergiesWithGames = allSynergies.filter(s => s.games > 0);
            const synergyScore = synergiesWithGames.length > 0 ? synergiesWithGames.reduce((acc, s) => acc + s.wr, 0) / synergiesWithGames.length : 50;
            
            let matchupScoreTotal = 0;
            let matchupCount = 0;
            teamPicks.forEach(p1 => {
                enemyPicks.forEach(p2 => {
                    const matchup = getMatchupStats(p1.hero, p2.hero, allMatches);
                    if (matchup.games > 0) {
                        matchupScoreTotal += matchup.wr;
                        matchupCount++;
                    }
                });
            });
            const matchupScore = matchupCount > 0 ? matchupScoreTotal / matchupCount : 50;

            const overallRating = (heroScore * 0.3) + (synergyScore * 0.4) + (matchupScore * 0.3);
            
            return { heroScore, synergyScore, matchupScore, overallRating };
        };

        const ourRatings = calculateDraftRatings(ourPicksWithStats, oppPicks, 'our_team');
        const oppRatings = calculateDraftRatings(oppPicksWithStats, ourPicks, 'opponent_team');

        const generateVerdictSummary = () => {
            let summary = [];
            const ratingDiff = ourRatings.overallRating - oppRatings.overallRating;

            if (ratingDiff > 7) summary.push("Ваш драфт имеет значительное преимущество.");
            else if (ratingDiff > 3) summary.push("Ваш драфт выглядит немного сильнее.");
            else if (ratingDiff < -7) summary.push("Драфт соперника выглядит значительно сильнее.");
            else if (ratingDiff < -3) summary.push("Драфт соперника выглядит немного сильнее.");
            else summary.push("Драфты примерно равны по силе.");

            if (ourRatings.matchupScore > 55 && ourRatings.matchupScore > oppRatings.matchupScore + 5) summary.push("У вас есть преимущество в прямых столкновениях (контр-пиках).");
            else if (ourRatings.matchupScore < 45) summary.push("Ваши герои плохо стоят против вражеских.");
            
            if (ourRatings.synergyScore > 55) summary.push("Ваши герои отлично взаимодействуют друг с другом.");
            if (oppRatings.synergyScore > 55) summary.push("У соперника очень сыгранные связки.");

            return summary.join(' ');
        };
        
        analysisVerdict.innerHTML = `
            <div class="verdict-card">
                <h4>Рейтинг нашего драфта</h4>
                <div class="value stat-value ${ourRatings.overallRating >= 50 ? 'win' : 'loss'}">${ourRatings.overallRating.toFixed(0)}</div>
            </div>
            <div class="verdict-card">
                <h4>Рейтинг драфта соперника</h4>
                <div class="value stat-value ${oppRatings.overallRating >= 50 ? 'loss' : 'win'}">${oppRatings.overallRating.toFixed(0)}</div>
            </div>
            <div class="verdict-card" style="grid-column: 1 / -1;">
                <h4>Краткий вывод</h4>
                <p style="font-size: 14px; line-height: 1.5;">${generateVerdictSummary()}</p>
            </div>
        `;

        const renderTeamColumn = (teamPicksWithStats, enemyPicksWithStats, teamType) => {
            return teamPicksWithStats.map(pick => {
                const heroName = pick.hero;
                const getStatClass = (wr) => wr > 55 ? 'win' : wr < 45 ? 'loss' : 'neutral';

                const synergies = teamPicksWithStats
                    .filter(p => p.hero !== heroName)
                    .map(p2 => ({ hero: p2.hero, ...getSynergyStats(heroName, p2.hero, teamType, allMatches) }))
                    .filter(s => s.games > 0);

                const matchups = enemyPicksWithStats
                    .map(p2 => ({ hero: p2.hero, ...getMatchupStats(heroName, p2.hero, allMatches) }))
                    .filter(m => m.games > 0);

                return `
                    <div class="hero-analysis-card">
                        <div class="hero-analysis-header"><img src="${ui.getHeroIconUrl(heroName)}"> ${heroName}</div>
                        <div class="hero-analysis-subheader">Общий WR: <b class="stat-value ${pick.wr >= 50 ? 'win' : 'loss'}">${pick.wr.toFixed(1)}%</b> за ${pick.games} игр</div>
                        <div class="analysis-details">
                            <h5>Синергия в этой команде</h5>
                            <ul>${synergies.length > 0 ? synergies.map(s => `<li><div class="hero-cell"><img src="${ui.getHeroIconUrl(s.hero)}">${s.hero}</div> <span class="stat-value ${getStatClass(s.wr)}">${s.wr.toFixed(1)}% WR</span></li>`).join('') : '<li>Нет данных</li>'}</ul>
                            <h5>Против врагов в этом матче</h5>
                             <ul>${matchups.length > 0 ? matchups.map(m => `<li><div class="hero-cell"><img src="${ui.getHeroIconUrl(m.hero)}">${m.hero}</div> <span class="stat-value ${getStatClass(m.wr)}">${m.wr.toFixed(1)}% WR</span></li>`).join('') : '<li>Нет данных</li>'}</ul>
                        </div>
                    </div>
                `;
            }).join('');
        };
        
        analysisOurTeam.innerHTML = renderTeamColumn(ourPicksWithStats, oppPicksWithStats, 'our_team');
        analysisOpponentTeam.innerHTML = renderTeamColumn(oppPicksWithStats, ourPicksWithStats, 'opponent_team');

        analysisModal.style.display = 'flex';
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
            return;
        }
        
        const analysisBtn = e.target.closest('.analysis-match-btn');
        if (analysisBtn) {
            openDraftAnalysisModal(analysisBtn.dataset.matchId);
        }
    });

    analysisModalCloseBtn.addEventListener('click', () => analysisModal.style.display = 'none');
    analysisModal.addEventListener('click', e => { if(e.target === analysisModal) analysisModal.style.display = 'none'; });
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