import * as ui from '../ui.js';
import * as dataService from '../dataService.js';
import * as store from '../store.js';

export async function initDashboardPage() {
    const dashboardContainer = document.getElementById('dashboard-container');
    if (!dashboardContainer) return;

    const teamNameDisplay = document.getElementById('team-name-display');
    const editTeamNameBtn = document.getElementById('edit-team-name-btn');
    const rosterList = document.getElementById('roster-list');
    const addPlayerForm = document.getElementById('add-player-form');
    const overallStatsContent = document.getElementById('overall-stats-content');
    const roleStatsContainer = document.getElementById('dashboard-role-stats-container');
    const opponentStatsBody = document.getElementById('dashboard-opponent-stats-body');
    const patchList = document.getElementById('patch-list');
    const addPatchForm = document.getElementById('add-patch-form');
    
    let userSettings = {};

    const renderTeamInfo = () => {
        const teamInfo = userSettings.team_info || { name: 'Моя Команда', roster: [] };
        teamNameDisplay.textContent = teamInfo.name;
        rosterList.innerHTML = '';
        (teamInfo.roster || []).forEach((player, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<div class="player-info"><span class="player-nickname">${player.nickname}</span><span class="hero-role-tag role-${player.role.toLowerCase()}">${player.role}</span></div><button class="btn-icon remove-btn delete" data-index="${index}" title="Удалить игрока">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
</button>`;
            rosterList.appendChild(li);
        });
        if (rosterList.innerHTML === '') {
            rosterList.innerHTML = '<li class="text-muted">Добавьте игроков в состав</li>';
        }
    };

    const renderPatches = () => {
        const patches = userSettings.patches || [];
        patches.sort().reverse();
        patchList.innerHTML = '';
        patches.forEach(patch => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${patch}</span><button class="remove-btn" data-patch="${patch}" title="Удалить патч">&times;</button>`;
            patchList.appendChild(li);
        });
        if (patchList.innerHTML === '') {
            patchList.innerHTML = '<li class="text-muted">Добавьте патчи</li>';
        }
    };

    const renderDashboardStats = (matches) => {
        const totalGames = matches.length;
        const wins = matches.filter(m => m.result === 'win').length;
        const losses = totalGames - wins;
        const winrate = totalGames > 0 ? (wins / totalGames * 100) : 0;
        overallStatsContent.innerHTML = `<div class="summary-item"><h4>Игр</h4><p>${totalGames}</p></div><div class="summary-item"><h4>Побед</h4><p>${wins}</p></div><div class="summary-item"><h4>Поражений</h4><p>${losses}</p></div><div class="summary-item"><h4>Winrate</h4><p class="winrate ${winrate >= 50 ? 'win' : 'loss'}">${winrate.toFixed(1)}%</p></div>`;

        const roleHeroStats = {};
        matches.forEach(m => {
            (m.picks?.our_team || []).forEach(p => {
                if (p.role && p.hero) {
                    if (!roleHeroStats[p.role]) roleHeroStats[p.role] = {};
                    if (!roleHeroStats[p.role][p.hero]) roleHeroStats[p.role][p.hero] = { picks: 0, wins: 0 };
                    roleHeroStats[p.role][p.hero].picks++;
                    if (m.result === 'win') {
                        roleHeroStats[p.role][p.hero].wins++;
                    }
                }
            });
        });

        roleStatsContainer.innerHTML = '';
        const rolesOrder = ['EXP', 'JUNGLE', 'MID', 'ROAM', 'GOLD', 'FLEX'];
        const createHeroListHTML = (heroes, statType) => {
            if (heroes.length === 0) return '<li class="text-muted" style="justify-content: flex-start;">Нет данных</li>';
            return heroes.map(h => {
                let statValueHTML = '';
                if (statType === 'picks') {
                    statValueHTML = `<span class="hero-stat-value">${h.picks} пик${h.picks !== 1 ? 'a' : ''}</span>`;
                } else if (statType === 'winrate') {
                    const wrClass = h.wr >= 50 ? 'win' : 'loss';
                    statValueHTML = `<span class="hero-stat-value ${wrClass}">${h.wr.toFixed(1)}% WR</span>`;
                }
                return `<li class="hero-list-item"><div class="hero-list-item-info"><img src="${ui.getHeroIconUrl(h.hero)}" class="hero-icon" alt="${h.hero}"><span>${h.hero}</span></div>${statValueHTML}</li>`;
            }).join('');
        };

        rolesOrder.forEach(role => {
            const block = document.createElement('div');
            block.className = 'role-stat-block';
            let heroDataForRole = [];
            if (roleHeroStats[role]) {
                heroDataForRole = Object.entries(roleHeroStats[role]).map(([hero, data]) => ({ hero, picks: data.picks, wins: data.wins, wr: data.picks > 0 ? (data.wins / data.picks) * 100 : 0 }));
            }
            const topPicks = [...heroDataForRole].sort((a, b) => b.picks - a.picks).slice(0, 5);
            const topWinrate = [...heroDataForRole].filter(h => h.picks >= 2).sort((a, b) => b.wr - a.wr || b.picks - a.picks).slice(0, 5);
            block.innerHTML = `<div class="role-stat-header"><span class="hero-role-tag role-${role.toLowerCase()}">${role}</span><h3>${role} Line</h3></div><div class="role-stat-content"><div><h4>Топ-5 по пикам</h4><ol class="hero-list">${createHeroListHTML(topPicks, 'picks')}</ol></div><div><h4>Топ-5 по WR (от 2 игр)</h4><ol class="hero-list">${createHeroListHTML(topWinrate, 'winrate')}</ol></div></div>`;
            roleStatsContainer.appendChild(block);
        });

        const opponentStats = {};
        matches.forEach(m => {
            const opp = m.opponent_team;
            if (!opponentStats[opp]) opponentStats[opp] = { g: 0, w: 0 };
            opponentStats[opp].g++;
            if (m.result === 'win') opponentStats[opp].w++;
        });
        opponentStatsBody.innerHTML = '';
        const sortedOpponents = Object.entries(opponentStats).map(([o, s]) => ({ opp: o, ...s, wr: s.g > 0 ? (s.w / s.g * 100) : 0 })).sort((a, b) => b.g - a.g).slice(0, 10);
        if (sortedOpponents.length === 0) {
            ui.displayEmptyState(opponentStatsBody, 'Нет данных', 4);
        } else {
            sortedOpponents.forEach(d => {
                const r = document.createElement('tr');
                r.innerHTML = `<td>${d.opp}</td><td>${d.g}</td><td>${d.w}-${d.g - d.w}</td><td>${d.wr.toFixed(1)}%</td>`;
                opponentStatsBody.appendChild(r);
            });
        }
    };
    
    editTeamNameBtn.addEventListener('click', async () => {
        const teamInfo = userSettings.team_info;
        const newName = prompt('Введите новое название команды:', teamInfo.name);
        if (newName && newName.trim() !== '') {
            teamInfo.name = newName.trim();
            const success = await dataService.updateUserSettings({ team_info: teamInfo });
            if (success) renderTeamInfo();
        }
    });

    addPlayerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nickname = document.getElementById('new-player-nickname').value.trim();
        const role = document.getElementById('new-player-role').value;
        if (nickname && role) {
            const teamInfo = userSettings.team_info;
            if (!teamInfo.roster) teamInfo.roster = [];
            teamInfo.roster.push({ nickname, role });
            const success = await dataService.updateUserSettings({ team_info: teamInfo });
            if (success) {
                renderTeamInfo();
                e.target.reset();
            }
        }
    });

    rosterList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const index = parseInt(e.target.dataset.index);
            ui.showConfirm('Удалить игрока из состава?', async () => {
                const teamInfo = userSettings.team_info;
                teamInfo.roster.splice(index, 1);
                const success = await dataService.updateUserSettings({ team_info: teamInfo });
                if (success) renderTeamInfo();
            });
        }
    });

    addPatchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPatch = document.getElementById('new-patch-name').value.trim();
        if (newPatch) {
            const patches = userSettings.patches || [];
            if (!patches.includes(newPatch)) {
                patches.push(newPatch);
                const success = await dataService.updateUserSettings({ patches: patches });
                if(success) {
                    renderPatches();
                    e.target.reset();
                }
            } else {
                ui.showToast('Этот патч уже существует.', 'error');
            }
        }
    });

    patchList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const patchToRemove = e.target.dataset.patch;
            ui.showConfirm(`Удалить патч "${patchToRemove}"?`, async () => {
                let patches = userSettings.patches || [];
                patches = patches.filter(p => p !== patchToRemove);
                const success = await dataService.updateUserSettings({ patches: patches });
                if (success) renderPatches();
            });
        }
    });

    overallStatsContent.innerHTML = '<div class="loading-spinner"></div>';
    roleStatsContainer.innerHTML = '';
    
    const [matches, settings] = await Promise.all([
        dataService.getMatches(),
        dataService.getUserSettings()
    ]);
    
    userSettings = settings;

    renderTeamInfo();
    renderPatches();
    renderDashboardStats(matches);
}