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
        ...match,
        ...match.draft_data
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

/**
 * ИСПРАВЛЕНО: Функция теперь не только импортирует матчи, но и возвращает настройки для обновления.
 * @param {object} importedData - Полный объект данных из JSON-файла.
 * @returns {Promise<{success: boolean, count: number, error: any}>}
 */
export async function importData(importedData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, count: 0, error: { message: 'Пользователь не авторизован' } };
    }

    const matchesToImport = importedData.matches || [];
    let matchesResult = { count: 0, error: null };

    // Импортируем матчи, если они есть
    if (matchesToImport.length > 0) {
        const preparedMatches = matchesToImport.map(match => {
            const { id, date, bans, picks, ...mainData } = match;
            const draft_data = { bans, picks };
            return { ...mainData, draft_data, user_id: user.id };
        });
        const { count, error } = await supabase.from('matches').insert(preparedMatches);
        matchesResult = { count: count || preparedMatches.length, error };
    }
    
    if (matchesResult.error) {
        console.error('Ошибка при импорте матчей:', matchesResult.error);
        return { success: false, count: 0, error: matchesResult.error };
    }

    // Импортируем настройки, если они есть
    const settingsToUpdate = {};
    if (importedData.team_info) {
        settingsToUpdate.team_info = importedData.team_info;
    }
    if (importedData.patches) {
        settingsToUpdate.patches = importedData.patches;
    }

    if (Object.keys(settingsToUpdate).length > 0) {
        const { error: settingsError } = await supabase
            .from('user_settings')
            .update(settingsToUpdate)
            .eq('id', user.id);
        
        if(settingsError) {
            console.error('Ошибка при импорте настроек:', settingsError);
            // Даже если настройки не сохранились, сообщаем об успехе импорта матчей
            ui.showToast('Матчи импортированы, но произошла ошибка при сохранении настроек.', 'error');
        }
    }

    return { success: true, count: matchesResult.count, error: null };
}


// --- ФУНКЦИИ ДЛЯ РАБОТЫ С НАСТРОЙКАМИ ПОЛЬЗОВАТЕЛЯ ---

export async function getUserSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { team_info: {}, patches: [] };

    let { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!settings) {
        const defaultSettings = {
            id: user.id,
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
            return { team_info: defaultSettings.team_info, patches: defaultSettings.patches };
        }
        settings = newSettings;
    }

    return {
        team_info: settings.team_info || { name: 'Моя Команда', roster: [] },
        patches: settings.patches || ['1.8.86']
    };
}

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