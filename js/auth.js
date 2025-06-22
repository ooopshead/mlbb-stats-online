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
        // ИСПРАВЛЕННЫЙ ПУТЬ
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

    let error = null;

    if (isRegisterMode) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        error = signUpError;
        if (!error) {
            alert('Регистрация успешна! На вашу почту отправлено письмо для подтверждения. После подтверждения вы сможете войти.');
            toggleLink.click();
        }
    } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        error = signInError;
    }

    if (error) {
        errorMessage.textContent = 'Ошибка: ' + (error.message || 'Неверный email или пароль.');
        submitButton.textContent = isRegisterMode ? 'Зарегистрироваться' : 'Войти';
    } else if (!isRegisterMode) {
        // ИСПРАВЛЕННЫЙ ПУТЬ
        window.location.href = 'dashboard.html';
    }
    
    submitButton.disabled = false;
});