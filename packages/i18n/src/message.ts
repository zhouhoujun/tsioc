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
        if (message.includes('{') && (message.includes(', plural,') || message.includes(', select,'))) {
            return this.formatICU(message, params, locale);
        }

        // Simple interpolation: {name} -> value
        return this.interpolate(message, params);
    }

    /**
     * simple interpolation.
     */
    private interpolate(message: string, params: Record<string, any>): string {
        // Replace # with value if present (ICU plural syntax)
        let result = message;
        if ('#' in params) {
            result = result.replace(/#/g, String(params['#']));
        }

        // Replace {name} with value
        result = result.replace(/\{(\w+)\}/g, (match, key) => {
            if (key in params) {
                const value = params[key];
                return String(value);
            }
            return match;
        });

        return result;
    }

    /**
     * ICU MessageFormat style formatting.
     * Supports plural and select.
     */
    private formatICU(message: string, params: Record<string, any>, locale: string): string {
        // Pattern: {count, plural, one{# item} other{# items}}
        // Pattern: {gender, select, male{He} female{She} other{They}}

        // Handle plural/select patterns by finding and replacing them
        let result = message;

        // Process each ICU pattern
        const patternRegex = /\{(\w+),\s*(plural|select),\s*/g;
        let match: RegExpExecArray | null;

        while ((match = patternRegex.exec(message)) !== null) {
            const startIndex = match.index;
            const key = match[1];
            const type = match[2];

            // Find the matching closing brace for the entire pattern
            const choicesStart = startIndex + match[0].length;
            const choicesEnd = this.findMatchingBrace(message, startIndex);

            if (choicesEnd === -1) continue;

            const choicesStr = message.substring(choicesStart, choicesEnd);
            const fullPattern = message.substring(startIndex, choicesEnd + 1);

            // Parse choices
            const choices = this.parseChoices(choicesStr);

            if (type === 'plural') {
                const value = params[key];
                if (typeof value === 'number') {
                    const pluralForm = this.getPluralForm(value, locale);
                    const choiceContent = choices[pluralForm] || choices['other'] || '';
                    const replacement = this.interpolate(choiceContent, { '#': value, ...params });
                    result = result.replace(fullPattern, replacement);
                }
            } else if (type === 'select') {
                const value = params[key];
                if (value !== undefined) {
                    const choiceContent = choices[String(value)] || choices['other'] || '';
                    const replacement = this.interpolate(choiceContent, params);
                    result = result.replace(fullPattern, replacement);
                }
            }
        }

        return this.interpolate(result, params);
    }

    /**
     * find matching closing brace.
     */
    private findMatchingBrace(str: string, startIndex: number): number {
        let depth = 1;
        for (let i = startIndex + 1; i < str.length; i++) {
            if (str[i] === '{') {
                depth++;
            } else if (str[i] === '}') {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    /**
     * parse choices from ICU pattern.
     */
    private parseChoices(choicesStr: string): Record<string, string> {
        const choices: Record<string, string> = {};
        const regex = /(one|other|zero|few|many|male|female|\w+)\s*\{/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(choicesStr)) !== null) {
            const category = match[1];
            const contentStart = match.index + match[0].length;
            const contentEnd = this.findMatchingBrace(choicesStr, match.index + match[0].length - 1);

            if (contentEnd !== -1) {
                const content = choicesStr.substring(contentStart, contentEnd);
                choices[category] = content.trim();
            }
        }

        return choices;
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