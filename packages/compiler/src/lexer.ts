/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export enum TokenType {
    Character,
    Identifier,
    Keyword,
    String,
    Operator,
    Number,
    Error
}

export namespace chars {

    export const $EOF = 0;
    export const $BSPACE = 8;
    export const $TAB = 9;
    export const $LF = 10;
    export const $VTAB = 11;
    export const $FF = 12;
    export const $CR = 13;
    export const $SPACE = 32;
    export const $BANG = 33;
    export const $DQ = 34;
    export const $HASH = 35;
    export const $$ = 36;
    export const $PERCENT = 37;
    export const $AMPERSAND = 38;
    export const $SQ = 39;
    export const $LPAREN = 40;
    export const $RPAREN = 41;
    export const $STAR = 42;
    export const $PLUS = 43;
    export const $COMMA = 44;
    export const $MINUS = 45;
    export const $PERIOD = 46;
    export const $SLASH = 47;
    export const $COLON = 58;
    export const $SEMICOLON = 59;
    export const $LT = 60;
    export const $EQ = 61;
    export const $GT = 62;
    export const $QUESTION = 63;

    export const $0 = 48;
    export const $7 = 55;
    export const $9 = 57;

    export const $A = 65;
    export const $E = 69;
    export const $F = 70;
    export const $X = 88;
    export const $Z = 90;

    export const $LBRACKET = 91;
    export const $BACKSLASH = 92;
    export const $RBRACKET = 93;
    export const $CARET = 94;
    export const $_ = 95;

    export const $a = 97;
    export const $b = 98;
    export const $e = 101;
    export const $f = 102;
    export const $n = 110;
    export const $r = 114;
    export const $t = 116;
    export const $u = 117;
    export const $v = 118;
    export const $x = 120;
    export const $z = 122;

    export const $LBRACE = 123;
    export const $BAR = 124;
    export const $RBRACE = 125;
    export const $NBSP = 160;

    export const $PIPE = 124;
    export const $TILDA = 126;
    export const $AT = 64;

    export const $BT = 96;

    export function isWhitespace(code: number): boolean {
        return (code >= $TAB && code <= $SPACE) || (code === $NBSP);
    }

    export function isDigit(code: number): boolean {
        return $0 <= code && code <= $9;
    }

    export function isAsciiLetter(code: number): boolean {
        return code >= $a && code <= $z || code >= $A && code <= $Z;
    }

    export function isAsciiHexDigit(code: number): boolean {
        return code >= $a && code <= $f || code >= $A && code <= $F || isDigit(code);
    }

    export function isNewLine(code: number): boolean {
        return code === $LF || code === $CR;
    }

    export function isOctalDigit(code: number): boolean {
        return $0 <= code && code <= $7;
    }
}

const KEYWORDS = ['var', 'let', 'as', 'null', 'undefined', 'true', 'false', 'if', 'else', 'this'];

export class Lexer {
    tokenize(text: string): Tokenize[] {
        const scanner = new Scanner(text);
        const tokens: Tokenize[] = [];
        let token = scanner.scanToken();
        while (token != null) {
            tokens.push(token);
            token = scanner.scanToken();
        }
        return tokens;
    }
}

export class Tokenize {
    constructor(
        public index: number, public type: TokenType, public numValue: number,
        public strValue: string) { }

    isCharacter(code: number): boolean {
        return this.type === TokenType.Character && this.numValue === code;
    }

    isNumber(): boolean { return this.type === TokenType.Number; }

    isString(): boolean { return this.type === TokenType.String; }

    isOperator(operator: string): boolean {
        return this.type === TokenType.Operator && this.strValue === operator;
    }

    isIdentifier(): boolean { return this.type === TokenType.Identifier; }

    isKeyword(): boolean { return this.type === TokenType.Keyword; }

    isKeywordLet(): boolean { return this.type === TokenType.Keyword && this.strValue === 'let'; }

    isKeywordAs(): boolean { return this.type === TokenType.Keyword && this.strValue === 'as'; }

    isKeywordNull(): boolean { return this.type === TokenType.Keyword && this.strValue === 'null'; }

    isKeywordUndefined(): boolean {
        return this.type === TokenType.Keyword && this.strValue === 'undefined';
    }

    isKeywordTrue(): boolean { return this.type === TokenType.Keyword && this.strValue === 'true'; }

    isKeywordFalse(): boolean { return this.type === TokenType.Keyword && this.strValue === 'false'; }

    isKeywordThis(): boolean { return this.type === TokenType.Keyword && this.strValue === 'this'; }

    isError(): boolean { return this.type === TokenType.Error; }

    toNumber(): number { return this.type === TokenType.Number ? this.numValue : -1; }

    toString(): string | null {
        switch (this.type) {
            case TokenType.Character:
            case TokenType.Identifier:
            case TokenType.Keyword:
            case TokenType.Operator:
            case TokenType.String:
            case TokenType.Error:
                return this.strValue;
            case TokenType.Number:
                return this.numValue.toString();
            default:
                return null;
        }
    }
}


function newCharacterToken(index: number, code: number): Tokenize {
    return new Tokenize(index, TokenType.Character, code, String.fromCharCode(code));
}

function newIdentifierToken(index: number, text: string): Tokenize {
    return new Tokenize(index, TokenType.Identifier, 0, text);
}

function newKeywordToken(index: number, text: string): Tokenize {
    return new Tokenize(index, TokenType.Keyword, 0, text);
}

function newOperatorToken(index: number, text: string): Tokenize {
    return new Tokenize(index, TokenType.Operator, 0, text);
}

function newStringToken(index: number, text: string): Tokenize {
    return new Tokenize(index, TokenType.String, 0, text);
}

function newNumberToken(index: number, n: number): Tokenize {
    return new Tokenize(index, TokenType.Number, n, '');
}

function newErrorToken(index: number, message: string): Tokenize {
    return new Tokenize(index, TokenType.Error, 0, message);
}

export const EOF: Tokenize = new Tokenize(-1, TokenType.Character, 0, '');

class Scanner {
    length: number;
    peek = 0;
    index = -1;

    constructor(public input: string) {
        this.length = input.length;
        this.advance();
    }

    advance() {
        this.peek = ++this.index >= this.length ? chars.$EOF : this.input.charCodeAt(this.index);
    }

    scanToken(): Tokenize | null {
        const input = this.input, length = this.length;
        let peek = this.peek, index = this.index;

        // Skip whitespace.
        while (peek <= chars.$SPACE) {
            if (++index >= length) {
                peek = chars.$EOF;
                break;
            } else {
                peek = input.charCodeAt(index);
            }
        }

        this.peek = peek;
        this.index = index;

        if (index >= length) {
            return null;
        }

        // Handle identifiers and numbers.
        if (isIdentifierStart(peek)) {
            return this.scanIdentifier();
        }
        if (chars.isDigit(peek)) {
            return this.scanNumber(index);
        }

        const start: number = index;
        switch (peek) {
            case chars.$PERIOD:
                this.advance();
                return chars.isDigit(this.peek) ? this.scanNumber(start) :
                    newCharacterToken(start, chars.$PERIOD);
            case chars.$LPAREN:
            case chars.$RPAREN:
            case chars.$LBRACE:
            case chars.$RBRACE:
            case chars.$LBRACKET:
            case chars.$RBRACKET:
            case chars.$COMMA:
            case chars.$COLON:
            case chars.$SEMICOLON:
                return this.scanCharacter(start, peek);
            case chars.$SQ:
            case chars.$DQ:
                return this.scanString();
            case chars.$HASH:
            case chars.$PLUS:
            case chars.$MINUS:
            case chars.$STAR:
            case chars.$SLASH:
            case chars.$PERCENT:
            case chars.$CARET:
                return this.scanOperator(start, String.fromCharCode(peek));
            case chars.$QUESTION:
                return this.scanComplexOperator(start, '?', chars.$PERIOD, '.');
            case chars.$LT:
            case chars.$GT:
                return this.scanComplexOperator(start, String.fromCharCode(peek), chars.$EQ, '=');
            case chars.$BANG:
            case chars.$EQ:
                return this.scanComplexOperator(
                    start, String.fromCharCode(peek), chars.$EQ, '=', chars.$EQ, '=');
            case chars.$AMPERSAND:
                return this.scanComplexOperator(start, '&', chars.$AMPERSAND, '&');
            case chars.$BAR:
                return this.scanComplexOperator(start, '|', chars.$BAR, '|');
            case chars.$NBSP:
                while (chars.isWhitespace(this.peek)) {
                    this.advance();
                }
                return this.scanToken();
        }

        this.advance();
        return this.error(`Unexpected character [${String.fromCharCode(peek)}]`, 0);
    }

    scanCharacter(start: number, code: number): Tokenize {
        this.advance();
        return newCharacterToken(start, code);
    }


    scanOperator(start: number, str: string): Tokenize {
        this.advance();
        return newOperatorToken(start, str);
    }

    /**
     * Tokenize a 2/3 char long operator
     *
     * @param start start index in the expression
     * @param one first symbol (always part of the operator)
     * @param twoCode code point for the second symbol
     * @param two second symbol (part of the operator when the second code point matches)
     * @param threeCode code point for the third symbol
     * @param three third symbol (part of the operator when provided and matches source expression)
     */
    scanComplexOperator(
        start: number, one: string, twoCode: number, two: string, threeCode?: number,
        three?: string): Tokenize {
        this.advance();
        let str: string = one;
        if (this.peek === twoCode) {
            this.advance();
            str += two;
        }
        if (threeCode != null && this.peek === threeCode) {
            this.advance();
            str += three;
        }
        return newOperatorToken(start, str);
    }

    scanIdentifier(): Tokenize {
        const start: number = this.index;
        this.advance();
        while (isIdentifierPart(this.peek)) {
            this.advance();
        }
        const str: string = this.input.substring(start, this.index);
        return KEYWORDS.indexOf(str) > -1 ? newKeywordToken(start, str) :
            newIdentifierToken(start, str);
    }

    scanNumber(start: number): Tokenize {
        let simple: boolean = (this.index === start);
        this.advance();  // Skip initial digit.
        while (true) {
            if (chars.isDigit(this.peek)) {
                // Do nothing.
            } else if (this.peek === chars.$PERIOD) {
                simple = false;
            } else if (isExponentStart(this.peek)) {
                this.advance();
                if (isExponentSign(this.peek)) {
                    this.advance();
                }
                if (!chars.isDigit(this.peek)) {
                    return this.error('Invalid exponent', -1);
                }
                simple = false;
            } else {
                break;
            }
            this.advance();
        }
        const str: string = this.input.substring(start, this.index);
        const value: number = simple ? parseIntAutoRadix(str) : parseFloat(str);
        return newNumberToken(start, value);
    }

    scanString(): Tokenize {
        const start: number = this.index;
        const quote: number = this.peek;
        this.advance();  // Skip initial quote.

        let buffer = '';
        let marker: number = this.index;
        const input: string = this.input;

        while (this.peek !== quote) {
            if (this.peek === chars.$BACKSLASH) {
                buffer += input.substring(marker, this.index);
                this.advance();
                let unescapedCode: number;
                // Workaround for TS2.1-introduced type strictness
                this.peek = this.peek;
                if (this.peek === chars.$u) {
                    // 4 character hex code for unicode character.
                    const hex: string = input.substring(this.index + 1, this.index + 5);
                    if (/^[0-9a-f]+$/i.test(hex)) {
                        unescapedCode = parseInt(hex, 16);
                    } else {
                        return this.error(`Invalid unicode escape [\\u${hex}]`, 0);
                    }
                    for (let i = 0; i < 5; i++) {
                        this.advance();
                    }
                } else {
                    unescapedCode = unescape(this.peek);
                    this.advance();
                }
                buffer += String.fromCharCode(unescapedCode);
                marker = this.index;
            } else if (this.peek === chars.$EOF) {
                return this.error('Unterminated quote', 0);
            } else {
                this.advance();
            }
        }

        const last: string = input.substring(marker, this.index);
        this.advance();  // Skip terminating quote.

        return newStringToken(start, buffer + last);
    }

    error(message: string, offset: number): Tokenize {
        const position: number = this.index + offset;
        return newErrorToken(
            position, `Lexer Error: ${message} at column ${position} in expression [${this.input}]`);
    }
}

function isIdentifierStart(code: number): boolean {
    return (chars.$a <= code && code <= chars.$z) || (chars.$A <= code && code <= chars.$Z) ||
        (code === chars.$_) || (code === chars.$$);
}

export function isIdentifier(input: string): boolean {
    if (input.length === 0) {
        return false;
    }
    const scanner = new Scanner(input);
    if (!isIdentifierStart(scanner.peek)) {
        return false;
    }
    scanner.advance();
    while (scanner.peek !== chars.$EOF) {
        if (!isIdentifierPart(scanner.peek)) {
            return false;
        }
        scanner.advance();
    }
    return true;
}

function isIdentifierPart(code: number): boolean {
    return chars.isAsciiLetter(code) || chars.isDigit(code) || (code === chars.$_) ||
        (code === chars.$$);
}

function isExponentStart(code: number): boolean {
    return code === chars.$e || code === chars.$E;
}

function isExponentSign(code: number): boolean {
    return code === chars.$MINUS || code === chars.$PLUS;
}

export function isQuote(code: number): boolean {
    return code === chars.$SQ || code === chars.$DQ || code === chars.$BT;
}

function unescape(code: number): number {
    switch (code) {
        case chars.$n:
            return chars.$LF;
        case chars.$f:
            return chars.$FF;
        case chars.$r:
            return chars.$CR;
        case chars.$t:
            return chars.$TAB;
        case chars.$v:
            return chars.$VTAB;
        default:
            return code;
    }
}

function parseIntAutoRadix(text: string): number {
    const result: number = parseInt(text);
    if (isNaN(result)) {
        throw new Error('Invalid integer literal when parsing ' + text);
    }
    return result;
}
