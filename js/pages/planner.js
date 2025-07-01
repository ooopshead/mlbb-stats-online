import * as store from '../store.js';
import * as ui from '../ui.js';
import * as dataService from '../dataService.js';

export async function initPlannerPage() {
    const plannerContent = document.getElementById('planner-content');
    if (!plannerContent) return;

    const opponentSelect = document.getElementById('planner-opponent-select');
    const placeholder = document.getElementById('planner-placeholder');
    const notesArea = document.getElementById('game-plan-notes');

    let allMatches = [];

    const populateOpponentSelect = () => {
        opponentSelect.innerHTML = '<option value="">-- Не выбрано --</option>';
        const opponentNames = [...new Set(allMatches.map(m => m.opponent_team).filter(Boolean))].sort();
        opponentNames.forEach(name => opponentSelect.add(new Option(name, name)));
    };

    const renderMatchHistory = (matches, limit = 5) => {
        const historyContainer = document.getElementById('planner-match-history');
        if (!historyContainer) return;
        historyContainer.innerHTML = '';

        const recentMatches = matches.slice(0, limit);

        if (recentMatches.length === 0) {
            historyContainer.innerHTML = '<div class="empty-state" style="padding: 1rem 0;"><p>Нет истории игр с этим соперником.</p></div>';
            return;
        }

        const draftToHtml = (draft, isBan = false) => (draft || []).map(item => {
            const hero = store.getH(item);
            return `<li><img src="${ui.getHeroIconUrl(hero)}" class="hero-icon" alt="${hero}" title="${hero}"></li>`;
        }).join('');

        const historyHtml = recentMatches.map(match => {
            const ourSide = match.our_team_side;
            const date = new Date(match.date).toLocaleDateString('ru-RU');
            
            // Используем isBan флаг для применения стилей к банам
            const ourBansHtml = `<ul class="compact-draft-list bans">${draftToHtml(match.bans?.our_team, true)}</ul>`;
            const ourPicksHtml = `<ul class="compact-draft-list picks">${draftToHtml(match.picks?.our_team)}</ul>`;
            const oppBansHtml = `<ul class="compact-draft-list bans">${draftToHtml(match.bans?.opponent_team, true)}</ul>`;
            const oppPicksHtml = `<ul class="compact-draft-list picks">${draftToHtml(match.picks?.opponent_team)}</ul>`;

            return `
                <div class="compact-match-card ${match.result}">
                    <div class="compact-match-header">
                        <span class="result ${match.result === 'win' ? 'result-win' : 'result-loss'}">${match.result === 'win' ? 'Победа' : 'Поражение'}</span>
                        <span class="text-muted">${date}</span>
                    </div>
                    <div class="compact-match-body">
                        <div class="compact-team-draft">
                            <span class="team-side-badge team-side-${ourSide}">Мы</span>
                            <div class="draft-row"><strong>Баны:</strong> ${ourBansHtml}</div>
                            <div class="draft-row"><strong>Пики:</strong> ${ourPicksHtml}</div>
                        </div>
                        <div class="compact-team-draft">
                            <span class="team-side-badge team-side-${ourSide === 'blue' ? 'red' : 'blue'}">Они</span>
                            <div class="draft-row"><strong>Баны:</strong> ${oppBansHtml}</div>
                            <div class="draft-row"><strong>Пики:</strong> ${oppPicksHtml}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        historyContainer.innerHTML = historyHtml;
    };

    const renderPlannerData = async () => {
        const opponent = opponentSelect.value;
        if (!opponent) {
            plannerContent.style.display = 'none';
            placeholder.style.display = 'block';
            return;
        }
        plannerContent.style.display = 'block';
        placeholder.style.display = 'none';
        document.querySelectorAll('.planner-opponent-name').forEach(el => el.textContent = opponent);
        
        notesArea.disabled = true;
        notesArea.value = "Загрузка заметок...";
        notesArea.value = await dataService.getPlannerNote(opponent);
        notesArea.disabled = false;

        const matchesVsOpponent = allMatches.filter(m => m.opponent_team === opponent);
        
        const clearFields = () => {
            document.getElementById('planner-h2h-stats').innerHTML = '';
            document.getElementById('planner-side-stats').innerHTML = '';
            document.getElementById('planner-opponent-signatures').innerHTML = '';
            document.getElementById('planner-opponent-synergy').innerHTML = '';
            document.getElementById('planner-opponent-roles').innerHTML = '';
            document.getElementById('planner-pick-advice').innerHTML = '';
            renderMatchHistory([]);
        }

        if (matchesVsOpponent.length === 0) {
            clearFields();
            ui.displayEmptyState(document.getElementById('planner-h2h-stats'), 'Нет данных', 3);
            return;
        }

        const totalGames = matchesVsOpponent.length;
        const wins = matchesVsOpponent.filter(m => m.result === 'win').length;
        const wr = totalGames > 0 ? (wins / totalGames * 100).toFixed(1) : '0.0';
        document.getElementById('planner-h2h-stats').innerHTML = `<div class="summary-item"><h4>Игр</h4><p>${totalGames}</p></div><div class="summary-item"><h4>В-П</h4><p>${wins}-${totalGames - wins}</p></div><div class="summary-item"><h4>WR%</h4><p class="winrate ${parseFloat(wr) >= 50 ? 'win' : 'loss'}">${wr}%</p></div>`;

        const blueGames = matchesVsOpponent.filter(m => m.our_team_side === 'blue');
        const redGames = matchesVsOpponent.filter(m => m.our_team_side === 'red');
        const blueWins = blueGames.filter(m => m.result === 'win').length;
        const redWins = redGames.filter(m => m.result === 'win').length;
        const blueWR = blueGames.length > 0 ? (blueWins / blueGames.length * 100) : 0;
        const redWR = redGames.length > 0 ? (redWins / redGames.length * 100) : 0;
        document.getElementById('planner-side-stats').innerHTML = `<div class="summary-item"><h4><span class="team-side-badge team-side-blue"></span>Синие</h4><p class="${blueWR >= 50 ? 'win' : 'loss'}">${blueWR.toFixed(1)}%</p></div><div class="summary-item"><h4><span class="team-side-badge team-side-red"></span>Красные</h4><p class="${redWR >= 50 ? 'win' : 'loss'}">${redWR.toFixed(1)}%</p></div>`;

        const oppPicks = {};
        const oppSynergy = {};
        const oppRoleStats = {};
        matchesVsOpponent.forEach(m => {
            (m.picks?.opponent_team || []).forEach(p => {
                const h = store.getH(p);
                if (!h) return;
                if (!oppPicks[h]) oppPicks[h] = { p: 0, w: 0 };
                oppPicks[h].p++;
                if (m.result === 'loss') oppPicks[h].w++;
                if (p.role) {
                    if (!oppRoleStats[p.role]) oppRoleStats[p.role] = {};
                    if (!oppRoleStats[p.role][h]) oppRoleStats[p.role][h] = { p: 0, w: 0 };
                    oppRoleStats[p.role][h].p++;
                    if (m.result === 'loss') oppRoleStats[p.role][h].w++;
                }
            });
            const oppTeamPicks = (m.picks?.opponent_team || []).map(store.getH).filter(Boolean);
            for (let i = 0; i < oppTeamPicks.length; i++) {
                for (let j = i + 1; j < oppTeamPicks.length; j++) {
                    const pair = [oppTeamPicks[i], oppTeamPicks[j]].sort().join('+');
                    if (!oppSynergy[pair]) oppSynergy[pair] = { g: 0, w: 0 };
                    oppSynergy[pair].g++;
                    if (m.result === 'loss') oppSynergy[pair].w++;
                }
            }
        });
        
        const signatures = Object.entries(oppPicks).map(([h, s]) => ({ h, p: s.p, wr: s.p > 0 ? (s.w / s.p * 100) : 0 })).sort((a, b) => b.p - a.p).slice(0, 10);
        const sigBody = document.getElementById('planner-opponent-signatures');
        if (signatures.length > 0) {
            sigBody.innerHTML = signatures.map(d => `<tr><td class="hero-cell" style="justify-content: flex-start;"><img src="${ui.getHeroIconUrl(d.h)}" class="hero-icon" style="width:24px; height:24px;"> ${d.h}</td><td>${d.p}</td><td class="${d.wr >= 50 ? 'win' : 'loss'}">${d.wr.toFixed(1)}%</td></tr>`).join('');
        } else {
            ui.displayEmptyState(sigBody, 'Нет данных', 3);
        }

        const synergy = Object.entries(oppSynergy).map(([p, s]) => ({ p, g: s.g, wr: s.g > 0 ? (s.w / s.g * 100) : 0 })).filter(d => d.g > 1).sort((a, b) => (b.g * b.wr) - (a.g * a.wr)).slice(0, 10);
        const synBody = document.getElementById('planner-opponent-synergy');
        if (synergy.length > 0) {
            synBody.innerHTML = synergy.map(d => {
                const heroes = d.p.split('+');
                return `<tr><td><div class="hero-list-item-info"><img src="${ui.getHeroIconUrl(heroes[0])}" class="hero-icon" style="width:24px; height:24px;"> + <img src="${ui.getHeroIconUrl(heroes[1])}" class="hero-icon" style="width:24px; height:24px;"></div></td><td>${d.g}</td><td class="${d.wr >= 50 ? 'win' : 'loss'}">${d.wr.toFixed(1)}%</td></tr>`;
            }).join('');
        } else {
            ui.displayEmptyState(synBody, 'Нет данных', 3);
        }
        
        const createAdviceTableHTML = (heroes) => {
            if (heroes.length === 0) return '<tr><td colspan="3" class="text-muted" style="text-align:center; padding: 10px 0;">Нет данных</td></tr>';
            return heroes.map(h => {
                const wrClass = h.wr >= 50 ? 'win' : 'loss';
                return `<tr><td class="hero-cell" style="justify-content: flex-start;"><img src="${ui.getHeroIconUrl(h.h)}" class="hero-icon" style="width:24px; height:24px;" alt="${h.h}"><span>${h.h}</span></td><td>${h.p}</td><td class="${wrClass}">${h.wr.toFixed(1)}%</td></tr>`;
            }).join('');
        };
        
        const adviceContainer = document.getElementById('planner-pick-advice');
        adviceContainer.innerHTML = '';
        if (signatures.length > 0) {
            signatures.forEach(sig => {
                const ourAnswers = Object.values(matchesVsOpponent.filter(m => (m.picks?.opponent_team || []).map(store.getH).includes(sig.h)).reduce((acc, match) => {
                    (match.picks?.our_team || []).forEach(pick => { const heroName = store.getH(pick); if (!heroName) return; acc[heroName] = acc[heroName] || { h: heroName, p: 0, w: 0 }; acc[heroName].p++; if (match.result === 'win') acc[heroName].w++; });
                    return acc;
                }, {})).map(d => ({ ...d, wr: d.p > 0 ? (d.w / d.p * 100) : 0 })).filter(d => d.p > 0).sort((a, b) => b.wr - a.wr || b.p - a.p).slice(0, 5);
                
                const generalCounters = Object.values(allMatches.filter(m => (m.picks?.opponent_team || []).map(store.getH).includes(sig.h)).reduce((acc, match) => {
                    (match.picks?.our_team || []).forEach(pick => { const heroName = store.getH(pick); if (!heroName) return; acc[heroName] = acc[heroName] || { h: heroName, p: 0, w: 0 }; acc[heroName].p++; if (match.result === 'win') acc[heroName].w++; });
                    return acc;
                }, {})).map(d => ({ ...d, wr: d.p > 0 ? (d.w / d.p * 100) : 0 })).filter(d => d.p > 1).sort((a, b) => b.wr - a.wr || b.p - a.p).slice(0, 5);
                
                const adviceBlock = document.createElement('div');
                adviceBlock.className = 'advice-block';
                adviceBlock.innerHTML = `
                    <div class="advice-threat">
                        <img src="${ui.getHeroIconUrl(sig.h)}" class="hero-icon">
                        <div>
                            <h4>${sig.h}</h4>
                            <p>${sig.p} игр, ${sig.wr.toFixed(1)}% WR</p>
                        </div>
                    </div>
                    <div class="advice-response">
                        <div>
                            <h5>Наш ответ (vs ${opponent})</h5>
                            <table class="modal-table"><thead><tr><th>Герой</th><th>Игр</th><th>WR%</th></tr></thead><tbody>${createAdviceTableHTML(ourAnswers)}</tbody></table>
                        </div>
                        <div>
                            <h5>Общие контр-пики (все игры)</h5>
                            <table class="modal-table"><thead><tr><th>Герой</th><th>Игр</th><th>WR%</th></tr></thead><tbody>${createAdviceTableHTML(generalCounters)}</tbody></table>
                        </div>
                    </div>`;
                adviceContainer.appendChild(adviceBlock);
            });
        }
        if (adviceContainer.innerHTML === '') {
            adviceContainer.innerHTML = '<div class="empty-state" style="padding:0;"><p>Недостаточно данных для советов.</p></div>';
        }

        renderMatchHistory(matchesVsOpponent, 5);
        const limitButtons = document.querySelectorAll('#planner-content .btn[data-limit]');
        limitButtons.forEach(btn => {
             const newBtn = btn.cloneNode(true);
             btn.parentNode.replaceChild(newBtn, btn);
             if(parseInt(newBtn.dataset.limit, 10) === 5) newBtn.classList.add('active');
             newBtn.addEventListener('click', () => {
                document.querySelectorAll('#planner-content .btn[data-limit]').forEach(b => b.classList.remove('active'));
                newBtn.classList.add('active');
                renderMatchHistory(matchesVsOpponent, parseInt(newBtn.dataset.limit, 10));
            });
        });

        // --- [ДОБАВЛЕННЫЙ БЛОК] РЕНДЕРИНГ АНАЛИЗА РОЛЕЙ СОПЕРНИКА ---
        const opponentRolesContainer = document.getElementById('planner-opponent-roles');
        opponentRolesContainer.innerHTML = '';
        const rolesOrder = ['EXP', 'JUNGLE', 'MID', 'ROAM', 'GOLD', 'FLEX'];
        
        const createOpponentHeroListHTML = (heroes, statType) => {
            if (heroes.length === 0) return '<li class="text-muted" style="justify-content: flex-start;">Нет данных</li>';
            return heroes.map(h => {
                let statValueHTML = '';
                if (statType === 'picks') {
                    statValueHTML = `<span class="hero-stat-value">${h.picks} пик${h.picks === 1 ? '' : 'а'}${h.picks > 4 ? 'ов' : ''}</span>`;
                } else if (statType === 'winrate') {
                    const wrClass = h.wr >= 50 ? 'win' : 'loss';
                    statValueHTML = `<span class="hero-stat-value ${wrClass}">${h.wr.toFixed(0)}% WR</span>`;
                }
                return `<li class="hero-list-item"><div class="hero-list-item-info"><img src="${ui.getHeroIconUrl(h.hero)}" class="hero-icon" alt="${h.hero}"><span>${h.hero}</span></div>${statValueHTML}</li>`;
            }).join('');
        };

        rolesOrder.forEach(role => {
            const block = document.createElement('div');
            block.className = 'role-stat-block';

            let heroDataForRole = [];
            if (oppRoleStats[role]) {
                heroDataForRole = Object.entries(oppRoleStats[role]).map(([hero, data]) => ({
                    hero: hero,
                    picks: data.p,
                    wins: data.w, // Победы соперника
                    wr: data.p > 0 ? (data.w / data.p) * 100 : 0
                }));
            }

            const topPicks = [...heroDataForRole].sort((a, b) => b.picks - a.picks).slice(0, 5);
            const topWinrate = [...heroDataForRole].filter(h => h.picks >= 1).sort((a, b) => b.wr - a.wr || b.picks - a.picks).slice(0, 5);

            block.innerHTML = `
                <div class="role-stat-header">
                    <span class="hero-role-tag role-${role.toLowerCase()}">${role}</span>
                    <h3>${role} Line</h3>
                </div>
                <div class="role-stat-content">
                    <div>
                        <h4>Топ-5 по пикам</h4>
                        <ol class="hero-list">${createOpponentHeroListHTML(topPicks, 'picks')}</ol>
                    </div>
                    <div>
                        <h4>Топ-5 по WR</h4>
                        <ol class="hero-list">${createOpponentHeroListHTML(topWinrate, 'winrate')}</ol>
                    </div>
                </div>`;
            opponentRolesContainer.appendChild(block);
        });

        if (opponentRolesContainer.innerHTML === '') {
             opponentRolesContainer.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p>Нет данных по ролям для этой команды.</p></div>';
        }
    };
    
    let saveTimeout;
    notesArea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        const opponent = opponentSelect.value;
        if (!opponent) return;

        saveTimeout = setTimeout(async () => {
            await dataService.savePlannerNote(opponent, notesArea.value);
        }, 500);
    });

    placeholder.innerHTML = '<div class="loading-spinner"></div>';
    allMatches = await dataService.getMatches();
    populateOpponentSelect();
    placeholder.innerHTML = '<p>Выберите команду соперника, чтобы загрузить аналитику и составить план на игру.</p>';
    opponentSelect.addEventListener('change', renderPlannerData);
}