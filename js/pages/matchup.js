import * as store from '../store.js';
import * as ui from '../ui.js';
import * as dataService from '../dataService.js';

export async function initMatchupPage() {
    const matchupContainer = document.getElementById('matchup-container');
    if (!matchupContainer) return;

    const hero1Select = document.getElementById('hero1-select');
    const hero2Select = document.getElementById('hero2-select');
    const resultsContainer = document.getElementById('matchup-results-container');
    const synergyCard = document.getElementById('synergy-result-card');
    const matchupCard = document.getElementById('matchup-result-card');
    const placeholder = document.getElementById('no-data-placeholder');
    
    let allMatches = [];

    const populateHeroSelects = () => {
        const createOption = (hero) => `<option value="${hero}">${hero}</option>`;
        const placeholderOption = '<option value="" disabled selected>-- Выберите героя --</option>';
        hero1Select.innerHTML = placeholderOption + store.heroes.map(createOption).join('');
        hero2Select.innerHTML = placeholderOption + store.heroes.map(createOption).join('');
    };

    const calculateAndRender = () => {
        const hero1 = hero1Select.value;
        const hero2 = hero2Select.value;

        if (!hero1 || !hero2) { return; }
        if (hero1 === hero2) {
            resultsContainer.style.display = 'none';
            placeholder.innerHTML = '<p>Выберите двух РАЗНЫХ героев.</p>';
            placeholder.style.display = 'block';
            return;
        }
        placeholder.style.display = 'none';
        resultsContainer.style.display = 'block';

        let synergy = { games: 0, wins: 0 };
        let matchup = { games: 0, hero1_wins: 0 };

        allMatches.forEach(match => {
            const ourPicks = (match.picks?.our_team || []).map(store.getH);
            const oppPicks = (match.picks?.opponent_team || []).map(store.getH);
            const h1_in_our = ourPicks.includes(hero1), h2_in_our = ourPicks.includes(hero2);
            const h1_in_opp = oppPicks.includes(hero1), h2_in_opp = oppPicks.includes(hero2);

            if ((h1_in_our && h2_in_our) || (h1_in_opp && h2_in_opp)) {
                synergy.games++;
                if ((h1_in_our && match.result === 'win') || (h1_in_opp && match.result === 'loss')) {
                    synergy.wins++;
                }
            }
            if ((h1_in_our && h2_in_opp) || (h1_in_opp && h2_in_our)) {
                matchup.games++;
                if ((h1_in_our && match.result === 'win') || (h1_in_opp && match.result === 'loss')) {
                    matchup.hero1_wins++;
                }
            }
        });
        
        // ... (код рендеринга карточек без изменений)
        if (synergy.games > 0) {
            const wr = (synergy.wins / synergy.games * 100).toFixed(1);
            synergyCard.innerHTML = `<div class="heroes"><img src="${ui.getHeroIconUrl(hero1)}" class="hero-icon"> <span style="font-size:24px;">+</span> <img src="${ui.getHeroIconUrl(hero2)}" class="hero-icon"></div><div class="stats-grid"><div class="stat-item"><h4>Игр вместе</h4><p>${synergy.games}</p></div><div class="stat-item"><h4>Побед</h4><p>${synergy.wins}</p></div><div class="stat-item"><h4>WR%</h4><p class="${wr >= 50 ? 'win' : 'loss'}">${wr}%</p></div></div>`;
        } else {
            synergyCard.innerHTML = '<div class="empty-state" style="padding:0;"><p>Эти герои ни разу не играли вместе.</p></div>';
        }

        if (matchup.games > 0) {
            const hero1_wr = (matchup.hero1_wins / matchup.games * 100).toFixed(1);
            const hero2_wins = matchup.games - matchup.hero1_wins;
            const hero2_wr = (hero2_wins / matchup.games * 100).toFixed(1);
            matchupCard.innerHTML = `<div class="heroes"><img src="${ui.getHeroIconUrl(hero1)}" class="hero-icon"> <span style="font-size:24px;">vs</span> <img src="${ui.getHeroIconUrl(hero2)}" class="hero-icon"></div><div class="stats-grid"><div class="stat-item"><h4>Игр против</h4><p>${matchup.games}</p></div><div class="stat-item"><h4>Побед ${hero1}</h4><p class="hero1-win">${matchup.hero1_wins} (${hero1_wr}%)</p></div><div class="stat-item"><h4>Побед ${hero2}</h4><p class="hero2-win">${hero2_wins} (${hero2_wr}%)</p></div></div>`;
        } else {
            matchupCard.innerHTML = '<div class="empty-state" style="padding:0;"><p>Эти герои ни разу не играли друг против друга.</p></div>';
        }
    };
    
    populateHeroSelects();
    hero1Select.addEventListener('change', calculateAndRender);
    hero2Select.addEventListener('change', calculateAndRender);

    allMatches = await dataService.getMatches();
}