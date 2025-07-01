import * as store from '../store.js';
import * as ui from '../ui.js';
import * as dataService from '../dataService.js';

export async function initStatsPage() {
    const statsTable = document.getElementById('stats-table');
    if (!statsTable) return;

    const statsTbody = document.getElementById('stats-tbody');
    const filterBtns = document.querySelectorAll('.controls .btn[data-filter]');
    const sideFilterBtns = document.querySelectorAll('.controls .btn[data-side-filter]');
    const matchTypeFilterBtns = document.querySelectorAll('.controls .btn[data-type-filter]');
    const opponentFilterSelect = document.getElementById('opponent-filter');
    const roleFilterSelect = document.getElementById('role-filter');
    const patchFilterContainer = document.getElementById('patch-filter-container');
    const tableHeaders = document.querySelectorAll('#stats-table th.sortable');
    const modal = document.getElementById('synergy-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalHeroName = document.getElementById('modal-hero-name');
    const roleStatsBody = document.getElementById('role-stats-body');
    const synergyTableBody = document.getElementById('synergy-table-body');
    const bestMatchupBody = document.getElementById('best-matchup-body');
    const worstMatchupBody = document.getElementById('worst-matchup-body');
    const draftTableBody = document.getElementById('draft-table-body');

    let currentFilter = 'overall',
        currentSideFilter = 'all',
        currentMatchTypeFilter = 'all';
    let sortKey = 'presence',
        sortDirection = 'desc';
    
    let allMatches = [];
    let userSettings = {};
    let currentlyFilteredMatches = [];

    const openSynergyModal = (heroName) => {
        modalHeroName.innerHTML = `<img src="${ui.getHeroIconUrl(heroName)}" class="hero-icon" alt=""> ${heroName}`;
        const roleStats = {}, synergy = {}, matchups = {}, draft = { blue: {}, red: {} };
        
        currentlyFilteredMatches.forEach(match => {
            const ourPicksFull = match.picks?.our_team || [];
            const oppPicksFull = match.picks?.opponent_team || [];
            const ourBansFull = match.bans?.our_team || [];
            const oppBansFull = match.bans?.opponent_team || [];

            const ourSide = match.our_team_side;
            const oppSide = ourSide === 'blue' ? 'red' : 'blue';

            // [ИСПРАВЛЕНО] Более надежная функция, которая проверяет и пики и баны
            const processTeamData = (picksData, bansData, isOurTeam, isWin) => {
                const teamPicks = picksData.map(store.getH);
                const teamBans = bansData.map(store.getH);
                const heroWasPicked = teamPicks.includes(heroName);
                const heroWasBanned = teamBans.includes(heroName);

                // Если героя не было ни в пиках, ни в банах, выходим
                if (!heroWasPicked && !heroWasBanned) return;

                // 1. Позиция на драфте (считаем всегда)
                const fullTeamDraft = [...picksData, ...bansData];
                const heroDraftItem = fullTeamDraft.find(item => store.getH(item) === heroName);
                if (heroDraftItem) {
                    const heroSide = isOurTeam ? ourSide : oppSide;
                    draft[heroSide] = draft[heroSide] || {};
                    draft[heroSide][heroDraftItem.phase] = (draft[heroSide][heroDraftItem.phase] || 0) + 1;
                }

                // Если герой не был пикнут, дальнейшую статистику (роли, синергия) не считаем
                if (!heroWasPicked) return;
                
                // 2. Статистика по ролям
                const heroPickData = picksData.find(p => store.getH(p) === heroName);
                if (heroPickData && heroPickData.role) {
                    if (!roleStats[heroPickData.role]) roleStats[heroPickData.role] = { g: 0, w: 0 };
                    roleStats[heroPickData.role].g++;
                    // [ИСПРАВЛЕНО] Опечатка heroPickA -> heroPickData
                    if (isWin) roleStats[heroPickData.role].w++;
                }

                // 3. Синергия (союзники)
                teamPicks.forEach(t => {
                    if (t !== heroName && t) {
                        synergy[t] = synergy[t] || { g: 0, w: 0 };
                        synergy[t].g++;
                        if (isWin) synergy[t].w++;
                    }
                });
                
                // 4. Противостояние (враги)
                const enemyPicks = (isOurTeam ? oppPicksFull : ourPicksFull).map(store.getH);
                enemyPicks.forEach(o => {
                    if (o) {
                        matchups[o] = matchups[o] || { g: 0, w: 0 };
                        matchups[o].g++;
                        if (isWin) matchups[o].w++;
                    }
                });
            };

            // Вызываем обработку только для команд, соответствующих фильтру
            if ((currentFilter === 'our_team' || currentFilter === 'overall') && (currentSideFilter === 'all' || currentSideFilter === ourSide)) {
                processTeamData(ourPicksFull, ourBansFull, true, match.result === 'win');
            }
            if ((currentFilter === 'opponent_team' || currentFilter === 'overall') && (currentSideFilter === 'all' || currentSideFilter === oppSide)) {
                processTeamData(oppPicksFull, oppBansFull, false, match.result === 'loss');
            }
        });

        const renderRoleStatsTable = () => {
            roleStatsBody.innerHTML = '';
            const sortedRoles = Object.entries(roleStats).map(([role, data]) => ({ role, ...data, wr: data.g > 0 ? (data.w / data.g * 100) : 0 })).sort((a, b) => b.g - a.g);
            if(sortedRoles.length === 0) { ui.displayEmptyState(roleStatsBody, 'Нет данных', 4); return; }
            sortedRoles.forEach(d => {
                const r = document.createElement('tr');
                const l = d.g - d.w;
                r.innerHTML = `<td><span class="hero-role-tag role-${d.role.toLowerCase()}">${d.role}</span></td><td>${d.g}</td><td>${d.w}-${l}</td><td>${d.wr.toFixed(1)}%</td>`;
                roleStatsBody.appendChild(r);
            });
        };

        const renderModalTable = (data, tbody, sortFn) => {
            const sorted = sortFn(data);
            tbody.innerHTML = '';
            sorted.forEach(d => {const r=document.createElement('tr'); const l = d.g - d.w; r.innerHTML=`<td><div class="hero-cell"><img src="${ui.getHeroIconUrl(d.h)}" class="hero-icon"> ${d.h}</div></td><td>${d.g}</td><td>${d.w}-${l}</td><td>${d.wr.toFixed(1)}%</td>`; tbody.appendChild(r);});
            if(sorted.length === 0) ui.displayEmptyState(tbody, 'Нет данных', 4);
        };

        const baseSort = (data) => Object.entries(data).map(([h, s]) => ({h, ...s, wr: s.g > 0 ? (s.w / s.g * 100) : 0}));
        renderRoleStatsTable();
        renderModalTable(synergy, synergyTableBody, d => baseSort(d).sort((a,b) => b.g - a.g || b.wr - a.wr).slice(0,10));
        renderModalTable(matchups, bestMatchupBody, d => baseSort(d).sort((a,b) => b.wr - a.wr || b.g - a.g).slice(0,5));
        renderModalTable(matchups, worstMatchupBody, d => baseSort(d).sort((a,b) => a.wr - b.wr || b.g - a.g).slice(0,5));

        const draftOrder = ['B1', 'B2', 'B3', 'B4', 'B5', 'P1', 'P2', 'P3', 'P4', 'P5'];
        draftTableBody.innerHTML = '';
        draftOrder.forEach(phase => {
            const blueCount = draft.blue?.[phase] || 0;
            const redCount = draft.red?.[phase] || 0;
            if (blueCount > 0 || redCount > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${phase}</td><td>${blueCount}</td><td>${redCount}</td>`;
                draftTableBody.appendChild(row);
            }
        });
        if(draftTableBody.innerHTML === '') ui.displayEmptyState(draftTableBody, 'Нет данных', 3);
        
        modal.style.display = 'flex';
    };
    
    const calculateAndRenderStats = () => {
        ui.displayLoading(statsTbody);

        const selectedPatches = Array.from(patchFilterContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        const selectedOpponent = opponentFilterSelect.value;
        const selectedRole = roleFilterSelect.value;

        let filteredMatches = allMatches.filter(m => {
            const matchPatch = m.patch || 'no_patch';
            const patchMatch = selectedPatches.length === 0 ? false : selectedPatches.includes(matchPatch);
            const typeMatch = currentMatchTypeFilter === 'all' || m.match_type === currentMatchTypeFilter;
            const opponentMatch = selectedOpponent === 'all' || m.opponent_team === selectedOpponent;
            return patchMatch && typeMatch && opponentMatch;
        });
        
        currentlyFilteredMatches = filteredMatches;

        const stats = {};
        const ensureHeroInStats = (hero) => {
            if (!stats[hero]) stats[hero] = { picks: 0, bans: 0, wins: 0, losses: 0 };
        };

        filteredMatches.forEach(match => {
            const processPicks = (picks, isOurTeam) => {
                (picks || []).forEach(p => {
                    const hero = store.getH(p);
                    if (!hero || (selectedRole !== 'all' && p.role !== selectedRole)) return;
                    ensureHeroInStats(hero);
                    stats[hero].picks++;
                    if (isOurTeam ? (match.result === 'win') : (match.result === 'loss')) {
                        stats[hero].wins++;
                    } else {
                        stats[hero].losses++;
                    }
                });
            };

            const processBans = (bans) => {
                if (selectedRole !== 'all') return;
                (bans || []).forEach(b => {
                    const hero = store.getH(b);
                    if (!hero) return;
                    ensureHeroInStats(hero);
                    stats[hero].bans++;
                });
            };

            const ourSide = match.our_team_side;
            if (currentFilter === 'our_team' || currentFilter === 'overall') {
                if (currentSideFilter === 'all' || currentSideFilter === ourSide) {
                    processPicks(match.picks?.our_team, true);
                    processBans(match.bans?.our_team);
                }
            }
            if (currentFilter === 'opponent_team' || currentFilter === 'overall') {
                const oppSide = ourSide === 'blue' ? 'red' : 'blue';
                if (currentSideFilter === 'all' || currentSideFilter === oppSide) {
                    processPicks(match.picks?.opponent_team, false);
                    processBans(match.bans?.opponent_team);
                }
            }
        });

        let statsArray = Object.keys(stats).map(hero => ({
            hero,
            ...stats[hero],
            totalGames: stats[hero].wins + stats[hero].losses,
            winrate: (stats[hero].wins + stats[hero].losses > 0) ? (stats[hero].wins / (stats[hero].wins + stats[hero].losses) * 100) : 0,
            presence: stats[hero].picks + stats[hero].bans,
        })).filter(data => data.picks > 0 || (selectedRole === 'all' && data.bans > 0));

        if (statsArray.length === 0) {
            ui.displayEmptyState(statsTbody, `Нет данных по выбранным фильтрам.`);
            return;
        }
        
        const currentSortKey = sortKey === 'presence' && selectedRole !== 'all' ? 'totalGames' : sortKey;
        statsArray.sort((a, b) => {
            let vA = a[currentSortKey], vB = b[currentSortKey];
            if (currentSortKey === 'hero') { vA = a.hero.toLowerCase(); vB = b.hero.toLowerCase(); }
            if (vA < vB) return sortDirection === 'asc' ? -1 : 1;
            if (vA > vB) return sortDirection === 'asc' ? 1 : -1;
            return b.totalGames - a.totalGames;
        });
        
        statsTbody.innerHTML = '';
        statsArray.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="hero-cell"><img src="${ui.getHeroIconUrl(data.hero)}" alt="${data.hero}" class="hero-icon"><span class="hero-name-clickable" data-hero="${data.hero}">${data.hero}</span></td><td>${data.presence}</td><td>${data.totalGames}</td><td>${data.wins}-${data.losses}</td><td>${data.winrate.toFixed(1)}%</td><td>${data.picks}</td><td>${data.bans}</td>`;
            statsTbody.appendChild(row);
        });

        statsTbody.querySelectorAll('.hero-name-clickable').forEach(el => {
            el.addEventListener('click', () => openSynergyModal(el.dataset.hero));
        });
        
        tableHeaders.forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.sortKey === currentSortKey) {
                th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        });
    };

    const populateOpponentFilter = () => {
        const opponentNames = [...new Set(allMatches.map(m => m.opponent_team).filter(Boolean))].sort();
        opponentFilterSelect.innerHTML = '<option value="all">Все команды</option>';
        opponentNames.forEach(name => opponentFilterSelect.add(new Option(name, name)));
    };

    const populatePatchFilter = () => {
        const patches = userSettings.patches || [];
        const dynamicPatchesContainer = patchFilterContainer;
        dynamicPatchesContainer.innerHTML = `<label for="patch-cb-none"><input type="checkbox" id="patch-cb-none" value="no_patch" checked>Без патча</label>`;
        
        patches.sort().reverse().forEach(p => {
            const id = `patch-cb-${p.replace(/\./g, '-')}`;
            const label = document.createElement('label');
            label.htmlFor = id;
            label.innerHTML = `<input type="checkbox" id="${id}" value="${p}" checked>${p}`;
            dynamicPatchesContainer.appendChild(label);
        });
        patchFilterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', calculateAndRenderStats));
    };

    const setupFilterButtons = (buttons, stateUpdater) => {
        buttons.forEach(btn => btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            stateUpdater(btn.dataset);
            calculateAndRenderStats();
        }));
    };
    setupFilterButtons(filterBtns, (data) => currentFilter = data.filter);
    setupFilterButtons(sideFilterBtns, (data) => currentSideFilter = data.sideFilter);
    setupFilterButtons(matchTypeFilterBtns, (data) => currentMatchTypeFilter = data.typeFilter);

    opponentFilterSelect.addEventListener('change', calculateAndRenderStats);
    roleFilterSelect.addEventListener('change', calculateAndRenderStats);

    tableHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const newSortKey = th.dataset.sortKey;
            if (sortKey === newSortKey) { sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = newSortKey;
                sortDirection = ['wins', 'presence', 'totalGames', 'winrate', 'picks', 'bans'].includes(newSortKey) ? 'desc' : 'asc';
            }
            calculateAndRenderStats();
        });
    });

    document.getElementById('clear-data-btn').addEventListener('click', () => {
        ui.showConfirm('Вы уверены, что хотите удалить ВСЕ матчи?', async () => {
            const matchesToDelete = [...allMatches];
            allMatches = [];
            calculateAndRenderStats();
            for (const match of matchesToDelete) {
                await dataService.deleteMatch(match.id);
            }
            ui.showToast('Все матчи удалены.', 'success');
        });
    });
    
    modalCloseBtn.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

    // Главная загрузка
    statsTbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div></td></tr>';
    
    const [matches, settings] = await Promise.all([
        dataService.getMatches(),
        dataService.getUserSettings(true) // Принудительно обновляем кэш
    ]);

    allMatches = matches;
    userSettings = settings;

    populateOpponentFilter();
    populatePatchFilter();
    calculateAndRenderStats();
}