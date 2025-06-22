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

        const draftToHtml = (draft) => (draft || []).map(item => {
            const hero = store.getH(item);
            return `<li><img src="${ui.getHeroIconUrl(hero)}" class="hero-icon" alt="${hero}" title="${hero}"></li>`;
        }).join('');

        const historyHtml = recentMatches.map(match => {
            const ourSide = match.our_team_side;
            const date = new Date(match.date).toLocaleDateString('ru-RU');
            return `
                <div class="compact-match-card ${match.result}">
                    <div class="compact-match-header">
                        <span class="result ${match.result === 'win' ? 'result-win' : 'result-loss'}">${match.result === 'win' ? 'Победа' : 'Поражение'}</span>
                        <span class="text-muted">${date}</span>
                    </div>
                    <div class="compact-match-body">
                        <div class="compact-team-draft"><span class="team-side-badge team-side-${ourSide}">Мы</span><div class="draft-row"><strong>Пики:</strong> <ul class="compact-draft-list">${draftToHtml(match.picks?.our_team)}</ul></div><div class="draft-row"><strong>Баны:</strong> <ul class="compact-draft-list">${draftToHtml(match.bans?.our_team)}</ul></div></div>
                        <div class="compact-team-draft"><span class="team-side-badge team-side-${ourSide === 'blue' ? 'red' : 'blue'}">Они</span><div class="draft-row"><strong>Пики:</strong> <ul class="compact-draft-list">${draftToHtml(match.picks?.opponent_team)}</ul></div><div class="draft-row"><strong>Баны:</strong> <ul class="compact-draft-list">${draftToHtml(match.bans?.opponent_team)}</ul></div></div>
                    </div>
                </div>`;
        }).join('');
        historyContainer.innerHTML = historyHtml;
    };

    const renderPlannerData = () => {
        const opponent = opponentSelect.value;
        if (!opponent) {
            plannerContent.style.display = 'none';
            placeholder.style.display = 'block';
            return;
        }
        plannerContent.style.display = 'block';
        placeholder.style.display = 'none';
        document.querySelectorAll('.planner-opponent-name').forEach(el => el.textContent = opponent);
        notesArea.value = localStorage.getItem(`planner_notes_${opponent}`) || '';

        const matchesVsOpponent = allMatches.filter(m => m.opponent_team === opponent);
        
        // Очистка всех полей перед рендерингом
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
        const wr = (wins / totalGames * 100).toFixed(1);
        document.getElementById('planner-h2h-stats').innerHTML = `<div class="summary-item"><h4>Игр</h4><p>${totalGames}</p></div><div class="summary-item"><h4>В-П</h4><p>${wins}-${totalGames - wins}</p></div><div class="summary-item"><h4>WR%</h4><p class="winrate ${wr >= 50 ? 'win' : 'loss'}">${wr}%</p></div>`;

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
        
        // --- ИСПРАВЛЕНО: Добавлены проверки на пустые данные ---

        const signatures = Object.entries(oppPicks).map(([h, s]) => ({ h, p: s.p, wr: s.p > 0 ? (s.w / s.p * 100) : 0 })).sort((a, b) => b.p - a.p).slice(0, 10);
        const sigBody = document.getElementById('planner-opponent-signatures');
        if (signatures.length > 0) {
            sigBody.innerHTML = signatures.map(d => `<tr><td class="hero-cell"><img src="${ui.getHeroIconUrl(d.h)}" class="hero-icon"> ${d.h}</td><td>${d.p}</td><td class="${d.wr >= 50 ? 'win' : 'loss'}">${d.wr.toFixed(1)}%</td></tr>`).join('');
        } else {
            ui.displayEmptyState(sigBody, 'Нет данных', 3);
        }

        const synergy = Object.entries(oppSynergy).map(([p, s]) => ({ p, g: s.g, wr: s.g > 0 ? (s.w / s.g * 100) : 0 })).filter(d => d.g > 1).sort((a, b) => (b.g * b.wr) - (a.g * a.wr)).slice(0, 10);
        const synBody = document.getElementById('planner-opponent-synergy');
        if (synergy.length > 0) {
            synBody.innerHTML = synergy.map(d => {
                const heroes = d.p.split('+');
                return `<tr><td><div class="hero-list-item-info"><img src="${ui.getHeroIconUrl(heroes[0])}" class="hero-icon"> + <img src="${ui.getHeroIconUrl(heroes[1])}" class="hero-icon"></div></td><td>${d.g}</td><td class="${d.wr >= 50 ? 'win' : 'loss'}">${d.wr.toFixed(1)}%</td></tr>`;
            }).join('');
        } else {
            ui.displayEmptyState(synBody, 'Нет данных', 3);
        }

        const createRoleHeroListHTML = (heroes, statType) => {
            if (heroes.length === 0) return '<tr><td colspan="3"><div class="empty-state" style="padding:10px 0">Нет данных</div></td></tr>';
            return heroes.map(h => {
                const wrClass = h.wr >= 50 ? 'win' : 'loss';
                const games = statType === 'picks' ? h.p : (h.g || h.p);
                return `<tr><td class="hero-cell"><img src="${ui.getHeroIconUrl(h.h)}" class="hero-icon" alt="${h.h}"><span>${h.h}</span></td><td>${games}</td><td class="${wrClass}">${h.wr.toFixed(1)}%</td></tr>`;
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
                        <h4>${sig.h}</h4>
                        <p>${sig.p} игр, ${sig.wr.toFixed(1)}% WR</p>
                    </div>
                    <div class="advice-response">
                        <div>
                            <h5>Наш ответ (Топ-5)</h5>
                            <table class="modal-table"><thead><tr><th>Герой</th><th>Игр</th><th>WR%</th></tr></thead><tbody>${createRoleHeroListHTML(ourAnswers, 'winrate')}</tbody></table>
                        </div>
                        <div style="margin-top: 1rem;">
                            <h5>Общие контр-пики (Топ-5)</h5>
                            <table class="modal-table"><thead><tr><th>Герой</th><th>Игр</th><th>WR%</th></tr></thead><tbody>${createRoleHeroListHTML(generalCounters, 'winrate')}</tbody></table>
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
    };
    
    notesArea.addEventListener('input', () => {
        const opponent = opponentSelect.value;
        if (opponent) localStorage.setItem(`planner_notes_${opponent}`, notesArea.value);
    });

    placeholder.innerHTML = '<div class="loading-spinner"></div>';
    allMatches = await dataService.getMatches();
    populateOpponentSelect();
    placeholder.innerHTML = '<p>Выберите команду соперника, чтобы загрузить аналитику и составить план на игру.</p>';
    opponentSelect.addEventListener('change', renderPlannerData);
}