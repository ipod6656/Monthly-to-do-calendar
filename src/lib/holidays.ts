// NOTE: This is a simplified list and does not include complex lunar calculations
// for every year. It's suitable for a client-side implementation where
// perfect accuracy for all past/future years is not a primary requirement.
// For a more robust solution, a server-side API call to a public holiday API is recommended.

interface Holiday {
    date: string; // YYYY-MM-DD
    name: string;
}

// Calculates lunar holidays for a given year.
// This is a simplified approximation and may not be accurate for all years.
// A proper implementation would use a dedicated astronomical library.
function getLunarHolidays(year: number): Holiday[] {
    // These dates are for 2024. This section would need a real lunar calendar calculation library for accuracy across years.
    // For the purpose of this example, we'll hardcode for 2024 and 2025.
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
            { date: '2025-05-05', name: '부처님 오신 날' }, // Also Children's day
            { date: '2025-10-05', name: '추석 연휴' },
            { date: '2025-10-06', name: '추석' },
            { date: '2025-10-07', name: '추석 연휴' },
            { date: '2025-10-08', name: '추석 대체공휴일' },
        ]
    }
    // Return empty for other years as we don't have the data.
    return [];
}


export function getHolidays(year: number): Holiday[] {
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

    // Add substitute holidays
    // Example for 2024: Children's day is on Sunday, so Monday is a substitute holiday.
    if (year === 2024) {
        yearSpecificHolidays.push({ date: '2024-05-06', name: '어린이날 대체공휴일' });
    }
     if (year === 2025) {
        yearSpecificHolidays.push({ date: '2025-05-06', name: '어린이날 대체공휴일' });
    }

    const lunarHolidays = getLunarHolidays(year);

    // Combine and sort
    return [...yearSpecificHolidays, ...lunarHolidays].sort((a, b) => a.date.localeCompare(b.date));
}
