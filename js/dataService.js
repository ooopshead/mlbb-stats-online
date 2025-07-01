import { supabase } from './supabaseClient.js';
import * as ui from './ui.js';

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
        opponent_team: match.opponent_team,
        match_type: match.match_type,
        patch: match.patch,
        our_team_side: match.our_team_side,
        result: match.result,
        notes: match.notes,
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
    const { bans, picks, id, date, ...mainData } = updatedData;
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

export async function importData(importedData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, count: 0, error: { message: 'Пользователь не авторизован' } };
    }

    await getUserSettings(true); 

    const matchesToImport = importedData.matches || [];
    let matchesResult = { count: 0, error: null };

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

    const settingsToUpdate = {};
    if (importedData.team_info) {
        settingsToUpdate.team_info = importedData.team_info;
    }
    if (importedData.patches) {
        settingsToUpdate.patches = importedData.patches;
    }

    if (Object.keys(settingsToUpdate).length > 0) {
        const success = await updateUserSettings(settingsToUpdate);
        if (!success) {
            ui.showToast('Матчи импортированы, но произошла ошибка при сохранении настроек.', 'error');
        }
    }

    return { success: true, count: matchesResult.count, error: null };
}

// --- ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАМЕТКАМИ ПЛАНЕРА ---

export async function getPlannerNote(opponentName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";

    const { data, error } = await supabase
        .from('planner_notes')
        .select('notes')
        .eq('user_id', user.id)
        .eq('opponent_name', opponentName)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Ошибка получения заметки:", error);
    }
    
    return data ? data.notes : "";
}

export async function savePlannerNote(opponentName, notes) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('planner_notes')
        .upsert({
            user_id: user.id,
            opponent_name: opponentName,
            notes: notes
        }, {
            onConflict: 'user_id, opponent_name'
        });

    if (error) {
        console.error("Ошибка сохранения заметки:", error);
        return false;
    }
    return true;
}


// --- ФУНКЦИИ ДЛЯ РАБОТЫ С НАСТРОЙКАМИ ПОЛЬЗОВАТЕЛЯ ---

let userSettingsCache = null;

export async function forceRefreshSettings() {
    userSettingsCache = null;
    return await getUserSettings();
}

export async function getUserSettings() {
    if (userSettingsCache) {
        return userSettingsCache;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { team_info: { name: 'Моя Команда', roster: [] }, patches: [] };

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
            console.error("Ошибка создания настроек:", error);
            return { team_info: defaultSettings.team_info, patches: defaultSettings.patches };
        }
        settings = newSettings;
    }
    
    userSettingsCache = {
        team_info: settings.team_info || { name: 'Моя Команда', roster: [] },
        patches: settings.patches || []
    };
    return userSettingsCache;
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
    
    await forceRefreshSettings();
    return true;
}
// --- ДОБАВЬТЕ ЭТОТ КОД В КОНЕЦ ФАЙЛА js/dataService.js ---

// --- ФУНКЦИИ ДЛЯ РАБОТЫ СО СТРАТЕГИЯМИ ДРАФТА ---

export async function getStrategies() {
    const { data, error } = await supabase
        .from('draft_strategies')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Ошибка при получении стратегий:', error);
        return [];
    }
    return data;
}

export async function saveStrategy(strategy) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const dataToUpsert = {
        ...strategy,
        user_id: user.id,
    };
    
    // Если это новая стратегия (id не задан), он будет создан базой данных.
    // Если id есть, запись обновится.
    const { data, error } = await supabase
        .from('draft_strategies')
        .upsert(dataToUpsert)
        .select()
        .single();
    
    if (error) {
        console.error('Ошибка при сохранении стратегии:', error);
        return null;
    }
    return data;
}

export async function deleteStrategy(strategyId) {
    const { error } = await supabase
        .from('draft_strategies')
        .delete()
        .eq('id', strategyId);

    if (error) {
        console.error('Ошибка при удалении стратегии:', error);
        return false;
    }
    return true;
}