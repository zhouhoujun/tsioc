import { Injectable } from '@tsdi/ioc';

/**
 * Currency formatter for i18n.
 *
 * 货币格式化器，根据语言环境格式化货币。
 */
@Injectable()
export class CurrencyFormatter {
    /**
     * format currency with locale.
     * @param value number value.
     * @param locale locale code.
     * @param currency currency code (e.g., 'USD', 'CNY').
     * @param options format options.
     */
    format(value: number, locale: string, currency?: string, options?: Intl.NumberFormatOptions): string {
        const opts: Intl.NumberFormatOptions = {
            style: 'currency',
            ...options
        };

        if (currency) {
            opts.currency = currency;
        }

        return new Intl.NumberFormat(locale, opts).format(value);
    }

    /**
     * format USD currency.
     * @param value number value.
     * @param locale locale code.
     */
    formatUSD(value: number, locale: string): string {
        return this.format(value, locale, 'USD');
    }

    /**
     * format CNY currency.
     * @param value number value.
     * @param locale locale code.
     */
    formatCNY(value: number, locale: string): string {
        return this.format(value, locale, 'CNY');
    }

    /**
     * format EUR currency.
     * @param value number value.
     * @param locale locale code.
     */
    formatEUR(value: number, locale: string): string {
        return this.format(value, locale, 'EUR');
    }

    /**
     * format JPY currency.
     * @param value number value.
     * @param locale locale code.
     */
    formatJPY(value: number, locale: string): string {
        return this.format(value, locale, 'JPY');
    }
}