import { supabase } from './supabaseClient.js';

/**
 * Получает все матчи для текущего залогиненного пользователя.
 * @returns {Promise<Array>} Массив объектов матчей.
 */
export async function getMatches() {
    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false }); // Сортируем от новых к старым

    if (error) {
        console.error('Ошибка при получении матчей:', error);
        return [];
    }
    
    // Преобразуем данные из базы в привычный нам формат
    return data.map(match => ({
        id: match.id,
        date: match.created_at,
        opponent_team: match.opponent_team,
        match_type: match.match_type,
        patch: match.patch,
        our_team_side: match.our_team_side,
        result: match.result,
        notes: match.notes,
        // Данные драфта хранятся в jsonb, просто возвращаем их
        ...match.draft_data 
    }));
}

/**
 * Добавляет новый матч в базу данных.
 * @param {object} matchData - Объект с данными матча.
 * @returns {Promise<object|null>} Возвращает добавленный объект или null в случае ошибки.
 */
export async function addMatch(matchData) {
    // Отделяем данные для JSON-колонки от остальных
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

/**
 * Обновляет существующий матч в базе данных.
 * @param {number} matchId - ID матча для обновления.
 * @param {object} updatedData - Объект с обновленными данными.
 * @returns {Promise<object|null>}
 */
export async function updateMatch(matchId, updatedData) {
    const { bans, picks, id, date, user_id, ...mainData } = updatedData; // Исключаем системные поля
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

/**
 * Удаляет матч из базы данных.
 * @param {number} matchId - ID матча для удаления.
 * @returns {Promise<boolean>} true в случае успеха, false в случае ошибки.
 */
export async function deleteMatch(matchId) {
    const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

    if (error) {
        console.error('Ошибка при удалении матча:', error);
        return false;
    }
    return true;
}

/**
 * Импортирует массив матчей в базу данных для текущего пользователя.
 * @param {Array<object>} matchesToImport - Массив матчей из JSON-файла.
 * @returns {Promise<{success: boolean, count: number, error: any}>}
 */
export async function importMatches(matchesToImport) {
    // Получаем ID текущего пользователя
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, count: 0, error: { message: 'Пользователь не авторизован' } };
    }

    // Подготавливаем данные: добавляем user_id и преобразуем в формат для Supabase
    const preparedMatches = matchesToImport.map(match => {
        const { id, date, bans, picks, ...mainData } = match;
        const draft_data = { bans, picks };
        return {
            ...mainData,
            draft_data,
            user_id: user.id // Привязываем каждый матч к текущему пользователю
        };
    });

    // Выполняем массовую вставку
    const { count, error } = await supabase
        .from('matches')
        .insert(preparedMatches);

    if (error) {
        console.error('Ошибка при импорте матчей:', error);
        return { success: false, count: 0, error };
    }

    return { success: true, count: count || preparedMatches.length, error: null };
}


// Функции для работы с командами, патчами и составом.
export const getTeamInfo = () => JSON.parse(localStorage.getItem('mlbb_team_info')) || { name: 'Моя Команда', roster: [] };
export const setTeamInfo = (info) => localStorage.setItem('mlbb_team_info', JSON.stringify(info));

export const getPatches = () => JSON.parse(localStorage.getItem('mlbb_patches')) || ['1.8.86'];
export const setPatches = (patches) => localStorage.setItem('mlbb_patches', JSON.stringify(patches));