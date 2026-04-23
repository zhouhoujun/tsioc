import { Injectable } from '@tsdi/ioc';

/**
 * Date formatter for i18n.
 *
 * 日期格式化器，根据语言环境格式化日期。
 */
@Injectable()
export class DateFormatter {
    /**
     * format date with locale.
     * @param value date value.
     * @param locale locale code.
     * @param options format options.
     */
    format(value: Date | string | number, locale: string, options?: Intl.DateTimeFormatOptions): string {
        const date = typeof value === 'string' || typeof value === 'number'
            ? new Date(value)
            : value;

        return new Intl.DateTimeFormat(locale, options).format(date);
    }

    /**
     * format short date.
     * @param value date value.
     * @param locale locale code.
     */
    formatShort(value: Date | string | number, locale: string): string {
        return this.format(value, locale, {
            dateStyle: 'short'
        });
    }

    /**
     * format medium date.
     * @param value date value.
     * @param locale locale code.
     */
    formatMedium(value: Date | string | number, locale: string): string {
        return this.format(value, locale, {
            dateStyle: 'medium'
        });
    }

    /**
     * format long date.
     * @param value date value.
     * @param locale locale code.
     */
    formatLong(value: Date | string | number, locale: string): string {
        return this.format(value, locale, {
            dateStyle: 'long'
        });
    }

    /**
     * format full date.
     * @param value date value.
     * @param locale locale code.
     */
    formatFull(value: Date | string | number, locale: string): string {
        return this.format(value, locale, {
            dateStyle: 'full'
        });
    }

    /**
     * format time.
     * @param value date value.
     * @param locale locale code.
     */
    formatTime(value: Date | string | number, locale: string): string {
        return this.format(value, locale, {
            timeStyle: 'short'
        });
    }

    /**
     * format datetime.
     * @param value date value.
     * @param locale locale code.
     */
    formatDateTime(value: Date | string | number, locale: string): string {
        return this.format(value, locale, {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    }
}