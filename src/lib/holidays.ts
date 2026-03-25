// This module provides South Korean holiday information.
// It uses a public API for real-time synchronization and falls back to hardcoded data.

interface Holiday {
    date: string; // YYYY-MM-DD
    name: string;
}

const HOLIDAY_API_URL = 'https://holidays-kr.s5r.jp/datetime.json';

// Cached holidays to avoid multiple fetches
let cachedHolidays: Holiday[] | null = null;

/**
 * Fetches South Korean holidays from a public API.
 * Includes temporary holidays and substitutes as they are updated in the registry.
 */
export async function fetchHolidays(year: number): Promise<Holiday[]> {
    try {
        if (!cachedHolidays) {
            const response = await fetch(HOLIDAY_API_URL);
            if (!response.ok) throw new Error('API response not ok');
            const data = await response.json();
            
            cachedHolidays = data.map((item: any) => ({
                date: new Date(item.datetime * 1000 + (9 * 60 * 60 * 1000)).toISOString().split('T')[0], // Adjust for KST (UTC+9)
                name: item.ko
            }));
        }
        
        return cachedHolidays!.filter(h => h.date.startsWith(year.toString()));
    } catch (error) {
        console.error("Failed to fetch live holidays, falling back to offline data:", error);
        return getOfflineHolidays(year);
    }
}

/**
 * Offline fallback for Korean holidays (2024-2026)
 */
function getOfflineHolidays(year: number): Holiday[] {
    const fixedHolidays = [
        { month: 1, day: 1, name: '신정' },
        { month: 3, day: 1, name: '삼일절' },
        { month: 5, day: 5, name: '어린이날' },
        { month: 6, day: 6, name: '현충일' },
        { month: 8, day: 15, name: '광복절' },
        { month: 10, day: 3, name: '개천절' },
        { month: 10, day: 9, name: '한글날' },
        { month: 12, day: 25, name: '크리스마스' },
    ];
    
    const yearSpecificHolidays: Holiday[] = fixedHolidays.map(h => ({
        date: `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
        name: h.name
    }));

    // Add substitute holidays based on year-specific rules
    if (year === 2024) {
        yearSpecificHolidays.push({ date: '2024-05-06', name: '어린이날 대체공휴일' });
    }
    if (year === 2026) {
        yearSpecificHolidays.push({ date: '2026-03-02', name: '삼일절 대체공휴일' });
        yearSpecificHolidays.push({ date: '2026-05-25', name: '부처님오신날 대체공휴일' });
        yearSpecificHolidays.push({ date: '2026-09-28', name: '추석 대체공휴일' });
    }

    const lunarHolidays = getLunarHolidays(year);
    return [...yearSpecificHolidays, ...lunarHolidays].sort((a, b) => a.date.localeCompare(b.date));
}

function getLunarHolidays(year: number): Holiday[] {
    if (year === 2024) {
        return [
            { date: '2024-02-09', name: '설날 연휴' },
            { date: '2024-02-10', name: '설날' },
            { date: '2024-02-11', name: '설날 연휴' },
            { date: '2024-02-12', name: '설날 대체공휴일' },
            { date: '2024-05-15', name: '부처님 오신 날' },
            { date: '2024-09-16', name: '추석 연휴' },
            { date: '2024-09-17', name: '추석' },
            { date: '2024-09-18', name: '추석 연휴' },
        ];
    }
    if (year === 2025) {
        return [
            { date: '2025-01-28', name: '설날 연휴' },
            { date: '2025-01-29', name: '설날' },
            { date: '2025-01-30', name: '설날 연휴' },
            { date: '2025-05-05', name: '부처님 오신 날' },
            { date: '2025-10-05', name: '추석 연휴' },
            { date: '2025-10-06', name: '추석' },
            { date: '2025-10-07', name: '추석 연휴' },
            { date: '2025-10-08', name: '추석 대체공휴일' },
        ];
    }
    if (year === 2026) {
        return [
            { date: '2026-02-16', name: '설날 연휴' },
            { date: '2026-02-17', name: '설날' },
            { date: '2026-02-18', name: '설날 연휴' },
            { date: '2026-05-23', name: '부처님 오신 날' },
            { date: '2026-09-24', name: '추석 연휴' },
            { date: '2026-09-25', name: '추석' },
            { date: '2026-09-26', name: '추석 연휴' },
        ];
    }
    return [];
}

// Keep backward compatibility
export function getHolidays(year: number): Holiday[] {
    return getOfflineHolidays(year);
}
