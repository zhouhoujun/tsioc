/**
 * Minimal five-field cron support for inject scheduling.
 *
 * Supported syntax per field: `*`, `* / step`, `a`, `a-b`, `a-b/step` and
 * comma-separated lists. Fields are minute, hour, day-of-month, month and
 * weekday (0 = Sunday).
 */
export interface CronSchedule {
    minutes: Set<number>;
    hours: Set<number>;
    days: Set<number>;
    months: Set<number>;
    weekdays: Set<number>;
    dayRestricted: boolean;
    weekdayRestricted: boolean;
}

function expandField(field: string, min: number, max: number): { values: Set<number>; restricted: boolean } {
    const values = new Set<number>();
    let restricted = false;
    const text = field.trim();
    if (!text) {
        throw new Error('Empty cron field');
    }
    for (const part of text.split(',')) {
        const [range, stepText] = part.split('/');
        const step = stepText === undefined ? 1 : Number(stepText);
        if (!Number.isInteger(step) || step <= 0) {
            throw new Error(`Invalid cron step: ${part}`);
        }
        let start: number;
        let end: number;
        if (range === '*') {
            start = min;
            end = max;
        } else if (range.includes('-')) {
            const [from, to] = range.split('-').map(Number);
            if (!Number.isInteger(from) || !Number.isInteger(to)) {
                throw new Error(`Invalid cron range: ${part}`);
            }
            start = from;
            end = to;
        } else {
            const value = Number(range);
            if (!Number.isInteger(value)) {
                throw new Error(`Invalid cron value: ${part}`);
            }
            start = value;
            end = value;
        }
        if (start < min || end > max || start > end) {
            throw new Error(`Cron value out of range: ${part}`);
        }
        if (range !== '*') {
            restricted = true;
        }
        for (let value = start; value <= end; value += step) {
            values.add(value);
        }
    }
    return { values, restricted };
}

export function parseCron(expression: string): CronSchedule {
    const fields = String(expression || '').trim().split(/\s+/).filter(Boolean);
    if (fields.length !== 5) {
        throw new Error('Cron expression must have five fields');
    }
    const minutes = expandField(fields[0], 0, 59);
    const hours = expandField(fields[1], 0, 23);
    const days = expandField(fields[2], 1, 31);
    const months = expandField(fields[3], 1, 12);
    const weekdays = expandField(fields[4], 0, 6);
    return {
        minutes: minutes.values,
        hours: hours.values,
        days: days.values,
        months: months.values,
        weekdays: weekdays.values,
        dayRestricted: days.restricted,
        weekdayRestricted: weekdays.restricted
    };
}

function matchesCron(schedule: CronSchedule, date: Date): boolean {
    if (!schedule.minutes.has(date.getMinutes())
        || !schedule.hours.has(date.getHours())
        || !schedule.months.has(date.getMonth() + 1)) {
        return false;
    }
    const dayMatch = schedule.days.has(date.getDate());
    const weekdayMatch = schedule.weekdays.has(date.getDay());
    if (schedule.dayRestricted && schedule.weekdayRestricted) {
        return dayMatch || weekdayMatch;
    }
    return dayMatch && weekdayMatch;
}

/** Next matching minute strictly after `from`. */
export function nextCronTime(expression: string, from: Date = new Date()): Date | undefined {
    const schedule = parseCron(expression);
    const date = new Date(from.getTime());
    date.setSeconds(0, 0);
    date.setMinutes(date.getMinutes() + 1);
    const limit = from.getTime() + 366 * 24 * 60 * 60 * 1000;
    while (date.getTime() <= limit) {
        if (matchesCron(schedule, date)) {
            return date;
        }
        date.setMinutes(date.getMinutes() + 1);
    }
    return undefined;
}
