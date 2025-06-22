import { supabase } from './supabaseClient.js';

// --- ФУНКЦИИ ДЛЯ РАБОТЫ С МАТЧАМИ ---

export async function getMatches() {
    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Ошибка при получении матчей:', error);
        return [];
    }
    
    return data.map(match => ({
        id: match.id,
        date: match.created_at,
        ...match, // остальные поля
        ...match.draft_data // распаковываем JSON
    }));
}

export async function addMatch(matchData) {
    const { bans, picks, ...mainData } = matchData;
    const draft_data = { bans, picks };

    const { data, error } = await supabase
        .from('matches')
        .insert([{ ...mainData, draft_data }])
        .select()
        .single();

    if (error) {
        console.error('Ошибка при добавлении матча:', error);
        return null;
    }
    return data;
}

export async function updateMatch(matchId, updatedData) {
    const { bans, picks, id, date, user_id, ...mainData } = updatedData;
    const draft_data = { bans, picks };

    const { data, error } = await supabase
        .from('matches')
        .update({ ...mainData, draft_data })
        .eq('id', matchId)
        .select()
        .single();
        
    if (error) {
        console.error('Ошибка при обновлении матча:', error);
        return null;
    }
    return data;
}

export async function deleteMatch(matchId) {
    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) {
        console.error('Ошибка при удалении матча:', error);
        return false;
    }
    return true;
}

export async function importMatches(matchesToImport) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, count: 0, error: { message: 'Пользователь не авторизован' } };
    }

    const preparedMatches = matchesToImport.map(match => {
        const { id, date, bans, picks, ...mainData } = match;
        const draft_data = { bans, picks };
        return { ...mainData, draft_data, user_id: user.id };
    });

    const { count, error } = await supabase.from('matches').insert(preparedMatches);
    if (error) {
        console.error('Ошибка при импорте матчей:', error);
        return { success: false, count: 0, error };
    }
    return { success: true, count: count || preparedMatches.length, error: null };
}

// --- НОВЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С НАСТРОЙКАМИ ПОЛЬЗОВАТЕЛЯ ---

/**
 * Получает настройки пользователя (инфо о команде, патчи).
 * Если настроек нет, создает их с дефолтными значениями.
 * @returns {Promise<object>} Объект с настройками.
 */
export async function getUserSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { team_info: {}, patches: [] };

    // 1. Пытаемся получить настройки
    let { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single();

    // 2. Если настроек нет (новый пользователь), создаем их
    if (!settings) {
        const defaultSettings = {
            id: user.id, // Связываем с ID пользователя
            team_info: { name: 'Моя Команда', roster: [] },
            patches: ['1.8.86']
        };
        const { data: newSettings, error } = await supabase
            .from('user_settings')
            .insert(defaultSettings)
            .select()
            .single();
        
        if (error) {
            console.error("Ошибка создания настроек для нового пользователя:", error);
            // Возвращаем дефолтные значения, чтобы приложение не сломалось
            return { team_info: defaultSettings.team_info, patches: defaultSettings.patches };
        }
        settings = newSettings;
    }

    // 3. Возвращаем данные в нужном формате
    return {
        team_info: settings.team_info || { name: 'Моя Команда', roster: [] },
        patches: settings.patches || ['1.8.86']
    };
}

/**
 * Обновляет настройки пользователя в базе данных.
 * @param {object} updates - Объект с полями для обновления (например, { team_info: ... } или { patches: ... }).
 * @returns {Promise<boolean>} true в случае успеха.
 */
export async function updateUserSettings(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('id', user.id);

    if (error) {
        console.error("Ошибка обновления настроек:", error);
        return false;
    }
    return true;
}