import { supabase } from './supabaseClient.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const toggleLink = document.getElementById('toggle-register');
const submitButton = form.querySelector('button');
const errorMessage = document.getElementById('error-message');

let isRegisterMode = false;

// Проверяем, если пользователь уже залогинен, перекидываем его на дашборд
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        window.location.href = '/dashboard.html';
    }
});


// Переключение между входом и регистрацией
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    errorMessage.textContent = '';
    form.reset(); // Очищаем поля при переключении

    if (isRegisterMode) {
        submitButton.textContent = 'Зарегистрироваться';
        toggleLink.innerHTML = 'Уже есть аккаунт? <strong>Войти</strong>';
    } else {
        submitButton.textContent = 'Войти';
        toggleLink.innerHTML = 'Нет аккаунта? <strong>Зарегистрироваться</strong>';
    }
});

// Обработка отправки формы
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessage.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Загрузка...';

    let error = null;

    if (isRegisterMode) {
        // Регистрация
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        error = signUpError;
        if (!error) {
            alert('Регистрация успешна! На вашу почту отправлено письмо для подтверждения. После подтверждения вы сможете войти.');
            // Можно переключить обратно в режим входа
            toggleLink.click();
        }
    } else {
        // Вход
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        error = signInError;
    }

    if (error) {
        errorMessage.textContent = 'Ошибка: ' + (error.message || 'Неверный email или пароль.');
        submitButton.textContent = isRegisterMode ? 'Зарегистрироваться' : 'Войти';
    } else if (!isRegisterMode) {
        // Если ошибок нет и это был вход, перенаправляем на дашборд
        window.location.href = '/dashboard.html';
    }
    
    submitButton.disabled = false;
});