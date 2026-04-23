/**
 * Message formatter for i18n.
 *
 * 消息格式化器，支持插值、复数、选择等格式。
 */
export class MessageFormatter {
    /**
     * format message with parameters.
     * @param message message template.
     * @param params interpolation parameters.
     * @param locale locale code.
     */
    format(message: string, params: Record<string, any>, locale: string): string {
        // Handle plural/select syntax
        if (message.includes('{') && message.includes(', plural,') || message.includes(', select,')) {
            return this.formatICU(message, params, locale);
        }

        // Simple interpolation: {name} -> value
        return this.interpolate(message, params);
    }

    /**
     * simple interpolation.
     */
    private interpolate(message: string, params: Record<string, any>): string {
        return message.replace(/\{(\w+)\}/g, (match, key) => {
            if (key in params) {
                const value = params[key];
                return String(value);
            }
            return match;
        });
    }

    /**
     * ICU MessageFormat style formatting.
     * Supports plural and select.
     */
    private formatICU(message: string, params: Record<string, any>, locale: string): string {
        // Pattern: {count, plural, one{# item} other{# items}}
        // Pattern: {gender, select, male{He} female{She} other{They}}

        const pluralRegex = /\{(\w+),\s*plural,\s*([^}]+)\}/g;
        const selectRegex = /\{(\w+),\s*select,\s*([^}]+)\}/g;

        // Handle plural
        let result = message.replace(pluralRegex, (match, key, choices) => {
            const value = params[key];
            if (typeof value !== 'number') return match;

            const pluralForm = this.getPluralForm(value, locale);
            const choice = this.extractChoice(choices, pluralForm, value);
            return this.interpolate(choice, { '#': value, ...params });
        });

        // Handle select
        result = result.replace(selectRegex, (match, key, choices) => {
            const value = params[key];
            if (value === undefined) return match;

            const choice = this.extractChoice(choices, String(value), value);
            return this.interpolate(choice, params);
        });

        return this.interpolate(result, params);
    }

    /**
     * extract choice from plural/select pattern.
     */
    private extractChoice(choices: string, category: string, value: any): string {
        // Parse: one{# item} other{# items}
        const parts = choices.split(/\s*(one|other|zero|few|many|male|female)\s*\{/);

        for (let i = 1; i < parts.length; i += 2) {
            const cat = parts[i];
            if (cat === category) {
                const content = parts[i + 1];
                return content.replace(/\}$/, '');
            }
        }

        // Fallback to 'other'
        for (let i = 1; i < parts.length; i += 2) {
            if (parts[i] === 'other') {
                const content = parts[i + 1];
                return content.replace(/\}$/, '');
            }
        }

        return String(value);
    }

    /**
     * get plural form for number.
     */
    private getPluralForm(n: number, locale: string): string {
        // Simple plural rules
        const lang = locale.split('-')[0];

        if (lang === 'zh' || lang === 'ja' || lang === 'ko') {
            return 'other';
        }

        if (lang === 'en' || lang === 'de' || lang === 'nl') {
            return n === 1 ? 'one' : 'other';
        }

        if (lang === 'ru' || lang === 'pl') {
            if (n % 10 === 1 && n % 100 !== 11) return 'one';
            if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'few';
            return 'other';
        }

        if (lang === 'ar') {
            if (n === 0) return 'zero';
            if (n === 1) return 'one';
            if (n === 2) return 'two';
            if (n >= 3 && n <= 10) return 'few';
            if (n >= 11 && n <= 99) return 'many';
            return 'other';
        }

        // Default: English-like
        return n === 1 ? 'one' : 'other';
    }
}