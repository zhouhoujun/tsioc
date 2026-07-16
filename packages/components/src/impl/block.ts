const BLOCK_MARKERS = ['@if', '@switch'];

export function transformBlocks(template: string): string {
    if (!template || !BLOCK_MARKERS.some(marker => template.includes(marker))) {
        return template;
    }
    return new BlockTransformer(template).transform();
}

class BlockTransformer {
    private pos = 0;
    private readonly length: number;
    private quote: string | null = null;
    private escaped = false;

    constructor(private readonly input: string) {
        this.length = input.length;
    }

    transform(): string {
        return this.parseContent();
    }

    private parseContent(stopTokens: string[] = []): string {
        let output = '';

        while (!this.eof()) {
            if (!this.isQuoted() && this.matchesStopToken(stopTokens)) {
                break;
            }

            if (!this.isQuoted() && this.startsWith('{{')) {
                output += this.readInterpolation();
                continue;
            }

            if (!this.isQuoted() && this.matchKeyword('@if')) {
                output += this.parseIfBlock();
                continue;
            }

            if (!this.isQuoted() && this.matchKeyword('@switch')) {
                output += this.parseSwitchBlock();
                continue;
            }

            output += this.consumeTextChar();
        }

        return output;
    }

    private parseIfBlock(): string {
        this.consumeKeyword('@if');
        const condition = this.readParenExpression();
        const body = this.readBlockBody();
        let output = `<template v-if="${this.escapeAttribute(condition)}">${body}</template>`;

        while (true) {
            this.skipWhitespace();
            if (!this.isQuoted() && this.matchKeyword('@else if')) {
                this.consumeKeyword('@else if');
                const elseIfCondition = this.readParenExpression();
                const elseIfBody = this.readBlockBody();
                output += `<template v-else-if="${this.escapeAttribute(elseIfCondition)}">${elseIfBody}</template>`;
                continue;
            }
            if (!this.isQuoted() && this.matchKeyword('@else')) {
                this.consumeKeyword('@else');
                const elseBody = this.readBlockBody();
                output += `<template v-else>${elseBody}</template>`;
            }
            break;
        }

        return output;
    }

    private parseSwitchBlock(): string {
        this.consumeKeyword('@switch');
        const switchExpr = this.readParenExpression();
        this.skipWhitespace();
        this.expectChar('{');

        let output = `<template v-switch="${this.escapeAttribute(switchExpr)}">`;

        while (!this.eof()) {
            this.skipWhitespace();

            if (!this.isQuoted() && this.currentChar() === '}') {
                this.pos++;
                break;
            }

            if (!this.isQuoted() && this.matchKeyword('@case')) {
                output += this.parseCaseBlock();
                continue;
            }

            if (!this.isQuoted() && this.matchKeyword('@default')) {
                output += this.parseDefaultBlock();
                continue;
            }

            output += this.parseContent(['@case', '@default', '}']);
        }

        return `${output}</template>`;
    }

    private parseCaseBlock(): string {
        this.consumeKeyword('@case');
        const caseExpr = this.readParenExpression();
        const body = this.readBlockBody();
        return `<template v-case="${this.escapeAttribute(caseExpr)}">${body}</template>`;
    }

    private parseDefaultBlock(): string {
        this.consumeKeyword('@default');
        const body = this.readBlockBody();
        return `<template v-default>${body}</template>`;
    }

    private readBlockBody(): string {
        this.skipWhitespace();
        this.expectChar('{');
        const body = this.parseContent(['}']);
        this.expectChar('}');
        return body;
    }

    private readParenExpression(): string {
        this.skipWhitespace();
        this.expectChar('(');

        let depth = 1;
        let output = '';
        let quote: string | null = null;
        let escape = false;

        while (!this.eof()) {
            const ch = this.consumeChar();

            if (quote) {
                output += ch;
                if (escape) {
                    escape = false;
                    continue;
                }
                if (ch === '\\') {
                    escape = true;
                    continue;
                }
                if (ch === quote) {
                    quote = null;
                }
                continue;
            }

            if (ch === '"' || ch === '\'' || ch === '`') {
                quote = ch;
                output += ch;
                continue;
            }

            if (ch === '(') {
                depth++;
                output += ch;
                continue;
            }

            if (ch === ')') {
                depth--;
                if (depth === 0) {
                    return output.trim();
                }
                output += ch;
                continue;
            }

            output += ch;
        }

        throw new Error('Unclosed block expression');
    }

    private readInterpolation(): string {
        let output = '';
        output += this.consumeChar();
        output += this.consumeChar();

        while (!this.eof()) {
            if (this.startsWith('}}')) {
                output += this.consumeChar();
                output += this.consumeChar();
                return output;
            }
            output += this.consumeChar();
        }

        return output;
    }

    private matchesStopToken(stopTokens: string[]): boolean {
        return stopTokens.some(token => this.startsWith(token));
    }

    private matchKeyword(keyword: string): boolean {
        if (!this.startsWith(keyword)) {
            return false;
        }
        const prev = this.pos > 0 ? this.input[this.pos - 1] : '';
        const next = this.input[this.pos + keyword.length] ?? '';
        if (prev && /[A-Za-z0-9_$-]/.test(prev)) {
            return false;
        }
        return !next || /[\s({]/.test(next);
    }

    private consumeKeyword(keyword: string): void {
        if (!this.matchKeyword(keyword)) {
            throw new Error(`Expected ${keyword}`);
        }
        this.pos += keyword.length;
    }

    private expectChar(char: string): void {
        this.skipWhitespace();
        if (this.currentChar() !== char) {
            throw new Error(`Expected '${char}'`);
        }
        this.pos++;
    }

    private skipWhitespace(): void {
        while (!this.eof() && /\s/.test(this.currentChar())) {
            this.pos++;
        }
    }

    private currentChar(): string {
        return this.input[this.pos] ?? '';
    }

    private consumeChar(): string {
        return this.input[this.pos++] ?? '';
    }

    private consumeTextChar(): string {
        const ch = this.consumeChar();

        if (this.quote) {
            if (this.escaped) {
                this.escaped = false;
                return ch;
            }
            if (ch === '\\') {
                this.escaped = true;
                return ch;
            }
            if (ch === this.quote) {
                this.quote = null;
            }
            return ch;
        }

        if (ch === '"' || ch === '\'' || ch === '`') {
            this.quote = ch;
            this.escaped = false;
        }
        return ch;
    }

    private startsWith(value: string): boolean {
        return this.input.startsWith(value, this.pos);
    }

    private eof(): boolean {
        return this.pos >= this.length;
    }

    private isQuoted(): boolean {
        return this.quote !== null;
    }

    private escapeAttribute(value: string): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;');
    }
}
