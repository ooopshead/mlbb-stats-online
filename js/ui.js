import { heroes } from './store.js';

// --- ОБЩИЕ UI-КОМПОНЕНТЫ И УТИЛИТЫ ---

export const getHeroIconUrl = (heroName) => {
    if (!heroName) return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // Placeholder for empty
    const formattedName = heroName.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
    return `img/heroes/${formattedName}.png`;
};

export const displayLoading = (element, colspan = 7) => {
    element.innerHTML = `<tr><td colspan="${colspan}"><div class="loading-spinner"></div></td></tr>`;
};

export const displayEmptyState = (element, message, colspan = 7) => {
    element.innerHTML = `<tr><td colspan="${colspan}"><div class="empty-state"><p>${message}</p></div></td></tr>`;
};

export const showToast = (message, type = 'info') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        if (type === 'error') console.error(message); else console.log(message);
        if (type !== 'success') alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
};

export const showConfirm = (message, onConfirm) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    overlay.innerHTML = `<div class="confirm-modal-content"><p>${message}</p><div class="confirm-modal-buttons"><button class="btn btn-danger" id="confirm-yes">Да</button><button class="btn" id="confirm-no">Нет</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById('confirm-yes').onclick = () => {
        onConfirm();
        overlay.remove();
    };
    document.getElementById('confirm-no').onclick = () => overlay.remove();
};


// --- ЛОГИКА АВТОДОПОЛНЕНИЯ ---
export function initAutocomplete(inputSelector) {
    const allHeroInputs = document.querySelectorAll(inputSelector);
    const suggestionsContainer = document.getElementById('autocomplete-container');
    if (!suggestionsContainer || allHeroInputs.length === 0) return;

    let activeInput = null;

    const displaySuggestions = (filteredList, input) => {
        suggestionsContainer.innerHTML = '';
        if (filteredList.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        const inputRect = input.getBoundingClientRect();
        suggestionsContainer.style.left = `${inputRect.left + window.scrollX}px`;
        suggestionsContainer.style.top = `${inputRect.bottom + window.scrollY}px`;
        suggestionsContainer.style.width = `${inputRect.width}px`;
        suggestionsContainer.style.display = 'block';
        filteredList.forEach(hero => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = hero;
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (activeInput) {
                    activeInput.value = hero;
                }
                suggestionsContainer.style.display = 'none';
            });
            suggestionsContainer.appendChild(item);
        });
    };

    allHeroInputs.forEach(input => {
        input.addEventListener('input', () => {
            activeInput = input;
            const value = input.value.toLowerCase();
            if (value.length > 0) {
                const filteredHeroes = heroes.filter(hero => hero.toLowerCase().startsWith(value));
                displaySuggestions(filteredHeroes, input);
            } else {
                suggestionsContainer.style.display = 'none';
            }
        });
        input.addEventListener('focus', () => {
            activeInput = input;
            if (input.value.length > 0) {
                const filteredHeroes = heroes.filter(hero => hero.toLowerCase().startsWith(input.value.toLowerCase()));
                displaySuggestions(filteredHeroes, input);
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('.autocomplete-suggestions') === null && e.target.closest(inputSelector) === null) {
            suggestionsContainer.style.display = 'none';
        }
    });
}