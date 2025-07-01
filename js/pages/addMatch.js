import * as store from '../store.js';
import * as ui from '../ui.js';
import * as dataService from '../dataService.js';
import { supabase } from '../supabaseClient.js';

export async function initAddMatchPage() {
    const matchForm = document.getElementById('match-form');
    if (!matchForm) return;

    ui.initAutocomplete('#match-form .hero-input');

    const opponentSelect = document.getElementById('opponent-team-select');
    const addNewOpponentBtn = document.getElementById('add-new-opponent-btn');
    const patchSelect = document.getElementById('match_patch');
    
    const populateOpponentSelect = async () => {
        const matches = await dataService.getMatches();
        const opponentNames = [...new Set(matches.map(match => match.opponent_team).filter(Boolean))].sort();
        const lastOpponent = localStorage.getItem('last_opponent');
        opponentSelect.innerHTML = '<option value="" disabled selected>-- Выберите команду --</option>';
        opponentNames.forEach(name => {
            opponentSelect.add(new Option(name, name));
        });
        if (lastOpponent && opponentSelect.querySelector(`option[value="${lastOpponent}"]`)) {
            opponentSelect.value = lastOpponent;
        }
    };

    const populatePatchSelect = async () => {
        const { patches } = await dataService.getUserSettings();
        const lastPatch = localStorage.getItem('last_patch');
        patchSelect.innerHTML = '';
        if (!patches || patches.length === 0) {
            patchSelect.innerHTML = '<option value="" disabled selected>Добавьте патч на Дашборде</option>';
        } else {
            patches.sort().reverse().forEach(p => patchSelect.add(new Option(p, p)));
            if (lastPatch && patchSelect.querySelector(`option[value="${lastPatch}"]`)) {
                patchSelect.value = lastPatch;
            }
        }
    };
    
    populateOpponentSelect();
    populatePatchSelect();

    addNewOpponentBtn.addEventListener('click', () => {
        const newTeamName = prompt('Введите название новой команды:');
        if (newTeamName && newTeamName.trim() !== '') {
            const trimmedName = newTeamName.trim();
            if ([...opponentSelect.options].every(opt => opt.value !== trimmedName)) {
                opponentSelect.add(new Option(trimmedName, trimmedName, true, true));
            } else {
                opponentSelect.value = trimmedName;
            }
        }
    });

    matchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Сохранение...';

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            ui.showToast('Ошибка: Пользователь не авторизован.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Сохранить матч';
            return;
        }

        const resultInput = document.querySelector('input[name="result"]:checked');
        const sideInput = document.querySelector('input[name="our_team_side"]:checked');

        if (!resultInput || !sideInput || !opponentSelect.value || !patchSelect.value) {
            ui.showToast('Пожалуйста, заполните все обязательные поля!', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Сохранить матч';
            return;
        }

        const allHeroInputs = Array.from(document.querySelectorAll('#match-form .hero-input'));
        const allHeroesInDraft = allHeroInputs.map(input => input.value).filter(Boolean);
        if (new Set(allHeroesInDraft).size < allHeroesInDraft.length) {
            ui.showToast('Ошибка: Герои не должны повторяться.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Сохранить матч';
            return;
        }

        localStorage.setItem('last_opponent', opponentSelect.value);
        localStorage.setItem('last_patch', patchSelect.value);

        const ourSide = sideInput.value;

        const getPickData = (side) => Array.from(document.querySelectorAll(`.${side}-pick`)).map((heroInput, i) => ({
            hero: heroInput.value,
            role: document.querySelectorAll(`.${side}-pick-role`)[i].value || null,
            phase: `P${i + 1}`
        })).filter(p => p.hero);

        const getBanData = (side) => Array.from(document.querySelectorAll(`.${side}-ban`)).map((input, i) => ({
            hero: input.value,
            phase: `B${i + 1}`
        })).filter(item => item.hero);

        const newMatchData = {
            user_id: user.id,
            opponent_team: opponentSelect.value,
            match_type: document.getElementById('match_type').value,
            patch: patchSelect.value,
            our_team_side: ourSide,
            result: resultInput.value,
            notes: document.getElementById('match-notes').value.trim(),
            bans: {
                our_team: getBanData(ourSide),
                opponent_team: getBanData(ourSide === 'blue' ? 'red' : 'blue')
            },
            picks: {
                our_team: getPickData(ourSide),
                opponent_team: getPickData(ourSide === 'blue' ? 'red' : 'blue')
            }
        };

        const result = await dataService.addMatch(newMatchData);

        if (result) {
            ui.showToast('Матч успешно сохранен!', 'success');
            matchForm.reset();
            document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
            await populateOpponentSelect();
        } else {
            ui.showToast('Ошибка при сохранении матча!', 'error');
        }

        submitButton.disabled = false;
        submitButton.textContent = 'Сохранить матч';
    });
}