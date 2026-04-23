import { Injectable } from '@tsdi/ioc';

/**
 * Number formatter for i18n.
 *
 * 数字格式化器，根据语言环境格式化数字。
 */
@Injectable()
export class NumberFormatter {
    /**
     * format number with locale.
     * @param value number value.
     * @param locale locale code.
     * @param options format options.
     */
    format(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
        return new Intl.NumberFormat(locale, options).format(value);
    }

    /**
     * format integer.
     * @param value number value.
     * @param locale locale code.
     */
    formatInteger(value: number, locale: string): string {
        return this.format(value, locale, {
            maximumFractionDigits: 0
        });
    }

    /**
     * format decimal.
     * @param value number value.
     * @param locale locale code.
     * @param fractionDigits fraction digits.
     */
    formatDecimal(value: number, locale: string, fractionDigits?: number): string {
        return this.format(value, locale, {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });
    }

    /**
     * format percent.
     * @param value number value (0-1).
     * @param locale locale code.
     */
    formatPercent(value: number, locale: string): string {
        return this.format(value, locale, {
            style: 'percent'
        });
    }
}