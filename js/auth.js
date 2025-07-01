import { supabase } from './supabaseClient.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const toggleLink = document.getElementById('toggle-register');
const submitButton = form.querySelector('button');
const errorMessage = document.getElementById('error-message');

let isRegisterMode = false;

supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        window.location.href = 'dashboard.html';
    }
});

toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    errorMessage.textContent = '';
    form.reset();
    if (isRegisterMode) {
        submitButton.textContent = 'Зарегистрироваться';
        toggleLink.innerHTML = 'Уже есть аккаунт? <strong>Войти</strong>';
    } else {
        submitButton.textContent = 'Войти';
        toggleLink.innerHTML = 'Нет аккаунта? <strong>Зарегистрироваться</strong>';
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessage.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Загрузка...';

    if (isRegisterMode) {
        // --- РЕГИСТРАЦИЯ (УПРОЩЕННАЯ ЛОГИКА) ---
        const { error: signUpError } = await supabase.auth.signUp({ email, password });

        if (signUpError) {
            errorMessage.textContent = 'Ошибка: ' + signUpError.message;
        } else {
            alert('Регистрация успешна! На вашу почту отправлено письмо для подтверждения (если включено). Администратор скоро рассмотрит вашу заявку.');
            toggleLink.click(); // Переключаем на форму входа
        }
        
    } else {
        // --- ВХОД (БЕЗ ИЗМЕНЕНИЙ) ---
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
            errorMessage.textContent = 'Ошибка: ' + (signInError.message || 'Неверный email или пароль.');
        } else {
            window.location.href = 'dashboard.html';
        }
    }
    
    submitButton.disabled = false;
    submitButton.textContent = isRegisterMode ? 'Зарегистрироваться' : 'Войти';
});