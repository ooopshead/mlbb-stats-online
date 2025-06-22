// Используем CDN для импорта библиотеки Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- ВАШИ УНИКАЛЬНЫЕ ДАННЫЕ ИЗ SUPABASE ---
// Зайдите в Project Settings -> API в вашем проекте на Supabase
const SUPABASE_URL = 'https://xanfcqvobwdtsjsrqtun.supabase.co'; // <-- ВСТАВЬТЕ ВАШ URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbmZjcXZvYndkdHNqc3JxdHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NjM5NjAsImV4cCI6MjA2NjEzOTk2MH0.ILOJ44goOkhleEGWp_9hiZskgphZRfGby9XT3Cv9wmA'; // <-- ВСТАВЬТЕ ВАШ КЛЮЧ (anon public)

// --- СОЗДАНИЕ КЛИЕНТА ---
// Этот объект 'supabase' будет использоваться во всем приложении для взаимодействия с базой данных
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);