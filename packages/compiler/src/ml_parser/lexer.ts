import { ParseSourceSpan, ParseError, ParseSourceFile, ParseLocation } from '../util';
import * as chars from '../chars';

export enum TokenType {
    TAG_OPEN_START,
    TAG_OPEN_END,
    TAG_OPEN_END_VOID,
    TAG_CLOSE,
    INCOMPLETE_TAG_OPEN,
    TEXT,
    ESCAPABLE_RAW_TEXT,
    RAW_TEXT,
    COMMENT_START,
    COMMENT_END,
    CDATA_START,
    CDATA_END,
    ATTR_NAME,
    ATTR_QUOTE,
    ATTR_VALUE,
    DOC_TYPE,
    EXPANSION_FORM_START,
    EXPANSION_CASE_VALUE,
    EXPANSION_CASE_EXP_START,
    EXPANSION_CASE_EXP_END,
    EXPANSION_FORM_END,
    EOF
}

export interface LexerRange {
    startPos: number;
    startLine: number;
    startCol: number;
    endPos: number;
}

export class Tokenize {
    constructor(
        public type: TokenType | null, public parts: string[], public sourceSpan: ParseSourceSpan) { }
}

export class TokenError extends ParseError {
    constructor(errorMsg: string, public tokenType: TokenType | null, span: ParseSourceSpan) {
        super(span, errorMsg);
    }
}

export class TokenizeResult {
    constructor(
        public tokens: Tokenize[], public errors: TokenError[],
        public nonNormalizedIcuExpressions: Tokenize[]) { }
}


export enum TagContentType {
    RAW_TEXT,
    ESCAPABLE_RAW_TEXT,
    PARSABLE_DATA
}

export interface TagDefinition {
    closedByParent: boolean;
    implicitNamespacePrefix: string | null;
    isVoid: boolean;
    ignoreFirstLf: boolean;
    canSelfClose: boolean;
    preventNamespaceInheritance: boolean;

    isClosedByChild(name: string): boolean;
    getContentType(prefix?: string): TagContentType;
}


/**
 * Options that modify how the text is tokenized.
 */
export interface TokenizeOptions {
    /** Whether to tokenize ICU messages (considered as text nodes when false). */
    tokenizeExpansionForms?: boolean;
    /** How to tokenize interpolation markers. */
    markers?: string[];
    /**
     * The start and end point of the text to parse within the `source` string.
     * The entire `source` string is parsed if this is not provided.
     * */
    range?: LexerRange;
    /**
     * If this text is stored in a JavaScript string, then we have to deal with escape sequences.
     *
     * **Example 1:**
     *
     * ```
     * "abc\"def\nghi"
     * ```
     *
     * - The `\"` must be converted to `"`.
     * - The `\n` must be converted to a new line character in a token,
     *   but it should not increment the current line for source mapping.
     *
     * **Example 2:**
     *
     * ```
     * "abc\
     *  def"
     * ```
     *
     * The line continuation (`\` followed by a newline) should be removed from a token
     * but the new line should increment the current line for source mapping.
     */
    escapedString?: boolean;
    /**
     * If this text is stored in an external template (e.g. via `templateUrl`) then we need to decide
     * whether or not to normalize the line-endings (from `\r\n` to `\n`) when processing ICU
     * expressions.
     *
     * If `true` then we will normalize ICU expression line endings.
     * The default is `false`, but this will be switched in a future major release.
     */
    i18nNormalizeLineEndingsInICUs?: boolean;
    /**
     * An array of characters that should be considered as leading trivia.
     * Leading trivia are characters that are not important to the developer, and so should not be
     * included in source-map segments.  A common example is whitespace.
     */
    leadingTriviaChars?: string[];
    /**
     * If true, do not convert CRLF to LF.
     */
    preserveLineEndings?: boolean;
}

export function tokenize(
    source: string, url: string, getTagDefinition: (tagName: string) => TagDefinition,
    options: TokenizeOptions = {}): TokenizeResult {
    const tokenizer = new _Tokenizer(new ParseSourceFile(source, url), getTagDefinition, options);
    tokenizer.tokenize();
    return new TokenizeResult(
        mergeTextTokens(tokenizer.tokens), tokenizer.errors, tokenizer.nonNormalizedIcuExpressions);
}

export const DEFAULT_MARKERS = ['{{', '}}'];

/**
 * The _Tokenizer uses objects of this type to move through the input text,
 * extracting "parsed characters". These could be more than one actual character
 * if the text contains escape sequences.
 */
interface CharacterCursor {
    /** Initialize the cursor. */
    init(): void;
    /** The parsed character at the current cursor position. */
    peek(): number;
    /** Advance the cursor by one parsed character. */
    advance(): void;
    /** Get a span from the marked start point to the current point. */
    getSpan(start?: this, leadingTriviaCodePoints?: number[]): ParseSourceSpan;
    /** Get the parsed characters from the marked start point to the current point. */
    getChars(start: this): string;
    /** The number of characters left before the end of the cursor. */
    charsLeft(): number;
    /** The number of characters between `this` cursor and `other` cursor. */
    diff(other: this): number;
    /** Make a copy of this cursor */
    clone(): CharacterCursor;
}

// See https://www.w3.org/TR/html51/syntax.html#writing-html-documents
class _Tokenizer {
    private _cursor: CharacterCursor;
    private _tokenizeIcu: boolean;
    private _markers: string[];
    private _leadingTriviaCodePoints: number[] | undefined;
    private _currentTokenStart: CharacterCursor | null = null;
    private _currentTokenType: TokenType | null = null;
    private _expansionCaseStack: TokenType[] = [];
    private _inInterpolation: boolean = false;
    private readonly _preserveLineEndings: boolean;
    private readonly _escapedString: boolean;
    private readonly _i18nNormalizeLineEndingsInICUs: boolean;
    tokens: Tokenize[] = [];
    errors: TokenError[] = [];
    nonNormalizedIcuExpressions: Tokenize[] = [];

    /**
     * @param _file The html source file being tokenized.
     * @param _getTagDefinition A function that will retrieve a tag definition for a given tag name.
     * @param options Configuration of the tokenization.
     */
    constructor(
        _file: ParseSourceFile, private _getTagDefinition: (tagName: string) => TagDefinition,
        options: TokenizeOptions) {
        this._tokenizeIcu = options.tokenizeExpansionForms || false;
        this._markers = options.markers || DEFAULT_MARKERS;
        this._leadingTriviaCodePoints =
            options.leadingTriviaChars && options.leadingTriviaChars.map(c => c.codePointAt(0) || 0);
        const range =
            options.range || { endPos: _file.content.length, startPos: 0, startLine: 0, startCol: 0 };
        this._cursor = options.escapedString ? new EscapedCharacterCursor(_file, range) :
            new PlainCharacterCursor(_file, range);
        this._preserveLineEndings = options.preserveLineEndings || false;
        this._escapedString = options.escapedString || false;
        this._i18nNormalizeLineEndingsInICUs = options.i18nNormalizeLineEndingsInICUs || false;
        try {
            this._cursor.init();
        } catch (e) {
            this.handleError(e);
        }
    }

    private _processCarriageReturns(content: string): string {
        if (this._preserveLineEndings) {
            return content;
        }
        // https://www.w3.org/TR/html51/syntax.html#preprocessing-the-input-stream
        // In order to keep the original position in the source, we can not
        // pre-process it.
        // Instead CRs are processed right before instantiating the tokens.
        return content.replace(_CR_OR_CRLF_REGEXP, '\n');
    }

    tokenize(): void {
        while (this._cursor.peek() !== chars.$EOF) {
            const start = this._cursor.clone();
            try {
                if (this._attemptCharCode(chars.$LT)) {
                    if (this._attemptCharCode(chars.$BANG)) {
                        if (this._attemptCharCode(chars.$LBRACKET)) {
                            this._consumeCdata(start);
                        } else if (this._attemptCharCode(chars.$MINUS)) {
                            this._consumeComment(start);
                        } else {
                            this._consumeDocType(start);
                        }
                    } else if (this._attemptCharCode(chars.$SLASH)) {
                        this._consumeTagClose(start);
                    } else {
                        this._consumeTagOpen(start);
                    }
                } else if (!(this._tokenizeIcu && this._tokenizeExpansionForm())) {
                    this._consumeText();
                }
            } catch (e) {
                this.handleError(e);
            }
        }
        this._beginToken(TokenType.EOF);
        this._endToken([]);
    }

    /**
     * @returns whether an ICU token has been created
     * @internal
     */
    private _tokenizeExpansionForm(): boolean {
        if (this.isExpansionFormStart()) {
            this._consumeExpansionFormStart();
            return true;
        }

        if (isExpansionCaseStart(this._cursor.peek()) && this._isInExpansionForm()) {
            this._consumeExpansionCaseStart();
            return true;
        }

        if (this._cursor.peek() === chars.$RBRACE) {
            if (this._isInExpansionCase()) {
                this._consumeExpansionCaseEnd();
                return true;
            }

            if (this._isInExpansionForm()) {
                this._consumeExpansionFormEnd();
                return true;
            }
        }

        return false;
    }

    private _beginToken(type: TokenType, start = this._cursor.clone()) {
        this._currentTokenStart = start;
        this._currentTokenType = type;
    }

    private _endToken(parts: string[], end?: CharacterCursor): Tokenize {
        if (this._currentTokenStart === null) {
            throw new TokenError(
                'Programming error - attempted to end a token when there was no start to the token',
                this._currentTokenType, this._cursor.getSpan(end));
        }
        if (this._currentTokenType === null) {
            throw new TokenError(
                'Programming error - attempted to end a token which has no token type', null,
                this._cursor.getSpan(this._currentTokenStart));
        }
        const token = new Tokenize(
            this._currentTokenType, parts,
            this._cursor.getSpan(this._currentTokenStart, this._leadingTriviaCodePoints));
        this.tokens.push(token);
        this._currentTokenStart = null;
        this._currentTokenType = null;
        return token;
    }

    private _createError(msg: string, span: ParseSourceSpan): _ControlFlowError {
        if (this._isInExpansionForm()) {
            msg += ` (Do you have an unescaped "{" in your template? Use "{{ '{' }}") to escape it.)`;
        }
        const error = new TokenError(msg, this._currentTokenType, span);
        this._currentTokenStart = null;
        this._currentTokenType = null;
        return new _ControlFlowError(error);
    }

    private handleError(e: any) {
        if (e instanceof CursorError) {
            e = this._createError(e.msg, this._cursor.getSpan(e.cursor));
        }
        if (e instanceof _ControlFlowError) {
            this.errors.push(e.error);
        } else {
            throw e;
        }
    }

    private _attemptCharCode(charCode: number): boolean {
        if (this._cursor.peek() === charCode) {
            this._cursor.advance();
            return true;
        }
        return false;
    }

    private _attemptCharCodeCaseInsensitive(charCode: number): boolean {
        if (compareCharCodeCaseInsensitive(this._cursor.peek(), charCode)) {
            this._cursor.advance();
            return true;
        }
        return false;
    }

    private _requireCharCode(charCode: number) {
        const location = this._cursor.clone();
        if (!this._attemptCharCode(charCode)) {
            throw this._createError(
                _unexpectedCharacterErrorMsg(this._cursor.peek()), this._cursor.getSpan(location));
        }
    }

    private _attemptStr(chars: string): boolean {
        const len = chars.length;
        if (this._cursor.charsLeft() < len) {
            return false;
        }
        const initialPosition = this._cursor.clone();
        for (let i = 0; i < len; i++) {
            if (!this._attemptCharCode(chars.charCodeAt(i))) {
                // If attempting to parse the string fails, we want to reset the parser
                // to where it was before the attempt
                this._cursor = initialPosition;
                return false;
            }
        }
        return true;
    }

    private _attemptStrCaseInsensitive(chars: string): boolean {
        for (let i = 0; i < chars.length; i++) {
            if (!this._attemptCharCodeCaseInsensitive(chars.charCodeAt(i))) {
                return false;
            }
        }
        return true;
    }

    private _requireStr(chars: string) {
        const location = this._cursor.clone();
        if (!this._attemptStr(chars)) {
            throw this._createError(
                _unexpectedCharacterErrorMsg(this._cursor.peek()), this._cursor.getSpan(location));
        }
    }

    private _attemptCharCodeUntilFn(predicate: (code: number) => boolean) {
        while (!predicate(this._cursor.peek())) {
            this._cursor.advance();
        }
    }

    private _requireCharCodeUntilFn(predicate: (code: number) => boolean, len: number) {
        const start = this._cursor.clone();
        this._attemptCharCodeUntilFn(predicate);
        if (this._cursor.diff(start) < len) {
            throw this._createError(
                _unexpectedCharacterErrorMsg(this._cursor.peek()), this._cursor.getSpan(start));
        }
    }

    private _attemptUntilChar(char: number) {
        while (this._cursor.peek() !== char) {
            this._cursor.advance();
        }
    }

    private _readChar(decodeEntities: boolean): string {
        if (decodeEntities && this._cursor.peek() === chars.$AMPERSAND) {
            return this._decodeEntity();
        } else {
            // Don't rely upon reading directly from `_input` as the actual char value
            // may have been generated from an escape sequence.
            const char = String.fromCodePoint(this._cursor.peek());
            this._cursor.advance();
            return char;
        }
    }

    private _decodeEntity(): string {
        const start = this._cursor.clone();
        this._cursor.advance();
        if (this._attemptCharCode(chars.$HASH)) {
            const isHex = this._attemptCharCode(chars.$x) || this._attemptCharCode(chars.$X);
            const codeStart = this._cursor.clone();
            this._attemptCharCodeUntilFn(isDigitEntityEnd);
            if (this._cursor.peek() != chars.$SEMICOLON) {
                // Advance cursor to include the peeked character in the string provided to the error
                // message.
                this._cursor.advance();
                const entityType = isHex ? CharacterReferenceType.HEX : CharacterReferenceType.DEC;
                throw this._createError(
                    _unparsableEntityErrorMsg(entityType, this._cursor.getChars(start)),
                    this._cursor.getSpan());
            }
            const strNum = this._cursor.getChars(codeStart);
            this._cursor.advance();
            try {
                const charCode = parseInt(strNum, isHex ? 16 : 10);
                return String.fromCharCode(charCode);
            } catch {
                throw this._createError(
                    _unknownEntityErrorMsg(this._cursor.getChars(start)), this._cursor.getSpan());
            }
        } else {
            const nameStart = this._cursor.clone();
            this._attemptCharCodeUntilFn(isNamedEntityEnd);
            if (this._cursor.peek() != chars.$SEMICOLON) {
                this._cursor = nameStart;
                return '&';
            }
            const name = this._cursor.getChars(nameStart);
            this._cursor.advance();
            const char = NAMED_ENTITIES[name];
            if (!char) {
                throw this._createError(_unknownEntityErrorMsg(name), this._cursor.getSpan(start));
            }
            return char;
        }
    }

    private _consumeRawText(decodeEntities: boolean, endMarkerPredicate: () => boolean): Tokenize {
        this._beginToken(decodeEntities ? TokenType.ESCAPABLE_RAW_TEXT : TokenType.RAW_TEXT);
        const parts: string[] = [];
        while (true) {
            const tagCloseStart = this._cursor.clone();
            const foundEndMarker = endMarkerPredicate();
            this._cursor = tagCloseStart;
            if (foundEndMarker) {
                break;
            }
            parts.push(this._readChar(decodeEntities));
        }
        return this._endToken([this._processCarriageReturns(parts.join(''))]);
    }

    private _consumeComment(start: CharacterCursor) {
        this._beginToken(TokenType.COMMENT_START, start);
        this._requireCharCode(chars.$MINUS);
        this._endToken([]);
        this._consumeRawText(false, () => this._attemptStr('-->'));
        this._beginToken(TokenType.COMMENT_END);
        this._requireStr('-->');
        this._endToken([]);
    }

    private _consumeCdata(start: CharacterCursor) {
        this._beginToken(TokenType.CDATA_START, start);
        this._requireStr('CDATA[');
        this._endToken([]);
        this._consumeRawText(false, () => this._attemptStr(']]>'));
        this._beginToken(TokenType.CDATA_END);
        this._requireStr(']]>');
        this._endToken([]);
    }

    private _consumeDocType(start: CharacterCursor) {
        this._beginToken(TokenType.DOC_TYPE, start);
        const contentStart = this._cursor.clone();
        this._attemptUntilChar(chars.$GT);
        const content = this._cursor.getChars(contentStart);
        this._cursor.advance();
        this._endToken([content]);
    }

    private _consumePrefixAndName(): string[] {
        const nameOrPrefixStart = this._cursor.clone();
        let prefix: string = '';
        while (this._cursor.peek() !== chars.$COLON && !isPrefixEnd(this._cursor.peek())) {
            this._cursor.advance();
        }
        let nameStart: CharacterCursor;
        if (this._cursor.peek() === chars.$COLON) {
            prefix = this._cursor.getChars(nameOrPrefixStart);
            this._cursor.advance();
            nameStart = this._cursor.clone();
        } else {
            nameStart = nameOrPrefixStart;
        }
        this._requireCharCodeUntilFn(isNameEnd, prefix === '' ? 0 : 1);
        const name = this._cursor.getChars(nameStart);
        return [prefix, name];
    }

    private _consumeTagOpen(start: CharacterCursor) {
        let tagName: string;
        let prefix: string;
        let openTagToken: Tokenize | undefined;
        try {
            if (!chars.isAsciiLetter(this._cursor.peek())) {
                throw this._createError(
                    _unexpectedCharacterErrorMsg(this._cursor.peek()), this._cursor.getSpan(start));
            }

            openTagToken = this._consumeTagOpenStart(start);
            prefix = openTagToken.parts[0];
            tagName = openTagToken.parts[1];
            this._attemptCharCodeUntilFn(isNotWhitespace);
            while (this._cursor.peek() !== chars.$SLASH && this._cursor.peek() !== chars.$GT &&
                this._cursor.peek() !== chars.$LT && this._cursor.peek() !== chars.$EOF) {
                this._consumeAttributeName();
                this._attemptCharCodeUntilFn(isNotWhitespace);
                if (this._attemptCharCode(chars.$EQ)) {
                    this._attemptCharCodeUntilFn(isNotWhitespace);
                    this._consumeAttributeValue();
                }
                this._attemptCharCodeUntilFn(isNotWhitespace);
            }
            this._consumeTagOpenEnd();
        } catch (e) {
            if (e instanceof _ControlFlowError) {
                if (openTagToken) {
                    // We errored before we could close the opening tag, so it is incomplete.
                    openTagToken.type = TokenType.INCOMPLETE_TAG_OPEN;
                } else {
                    // When the start tag is invalid, assume we want a "<" as text.
                    // Back to back text tokens are merged at the end.
                    this._beginToken(TokenType.TEXT, start);
                    this._endToken(['<']);
                }
                return;
            }

            throw e;
        }

        const contentTokenType = this._getTagDefinition(tagName).getContentType(prefix);

        if (contentTokenType === TagContentType.RAW_TEXT) {
            this._consumeRawTextWithTagClose(prefix, tagName, false);
        } else if (contentTokenType === TagContentType.ESCAPABLE_RAW_TEXT) {
            this._consumeRawTextWithTagClose(prefix, tagName, true);
        }
    }

    private _consumeRawTextWithTagClose(prefix: string, tagName: string, decodeEntities: boolean) {
        this._consumeRawText(decodeEntities, () => {
            if (!this._attemptCharCode(chars.$LT)) return false;
            if (!this._attemptCharCode(chars.$SLASH)) return false;
            this._attemptCharCodeUntilFn(isNotWhitespace);
            if (!this._attemptStrCaseInsensitive(tagName)) return false;
            this._attemptCharCodeUntilFn(isNotWhitespace);
            return this._attemptCharCode(chars.$GT);
        });
        this._beginToken(TokenType.TAG_CLOSE);
        this._requireCharCodeUntilFn(code => code === chars.$GT, 3);
        this._cursor.advance();  // Consume the `>`
        this._endToken([prefix, tagName]);
    }

    private _consumeTagOpenStart(start: CharacterCursor) {
        this._beginToken(TokenType.TAG_OPEN_START, start);
        const parts = this._consumePrefixAndName();
        return this._endToken(parts);
    }

    private _consumeAttributeName() {
        const attrNameStart = this._cursor.peek();
        if (attrNameStart === chars.$SQ || attrNameStart === chars.$DQ) {
            throw this._createError(_unexpectedCharacterErrorMsg(attrNameStart), this._cursor.getSpan());
        }
        this._beginToken(TokenType.ATTR_NAME);
        const prefixAndName = this._consumePrefixAndName();
        this._endToken(prefixAndName);
    }

    private _consumeAttributeValue() {
        let value: string;
        if (this._cursor.peek() === chars.$SQ || this._cursor.peek() === chars.$DQ) {
            this._beginToken(TokenType.ATTR_QUOTE);
            const quoteChar = this._cursor.peek();
            this._cursor.advance();
            this._endToken([String.fromCodePoint(quoteChar)]);
            this._beginToken(TokenType.ATTR_VALUE);
            const parts: string[] = [];
            while (this._cursor.peek() !== quoteChar) {
                parts.push(this._readChar(true));
            }
            value = parts.join('');
            this._endToken([this._processCarriageReturns(value)]);
            this._beginToken(TokenType.ATTR_QUOTE);
            this._cursor.advance();
            this._endToken([String.fromCodePoint(quoteChar)]);
        } else {
            this._beginToken(TokenType.ATTR_VALUE);
            const valueStart = this._cursor.clone();
            this._requireCharCodeUntilFn(isNameEnd, 1);
            value = this._cursor.getChars(valueStart);
            this._endToken([this._processCarriageReturns(value)]);
        }
    }

    private _consumeTagOpenEnd() {
        const tokenType =
            this._attemptCharCode(chars.$SLASH) ? TokenType.TAG_OPEN_END_VOID : TokenType.TAG_OPEN_END;
        this._beginToken(tokenType);
        this._requireCharCode(chars.$GT);
        this._endToken([]);
    }

    private _consumeTagClose(start: CharacterCursor) {
        this._beginToken(TokenType.TAG_CLOSE, start);
        this._attemptCharCodeUntilFn(isNotWhitespace);
        const prefixAndName = this._consumePrefixAndName();
        this._attemptCharCodeUntilFn(isNotWhitespace);
        this._requireCharCode(chars.$GT);
        this._endToken(prefixAndName);
    }

    private _consumeExpansionFormStart() {
        this._beginToken(TokenType.EXPANSION_FORM_START);
        this._requireCharCode(chars.$LBRACE);
        this._endToken([]);

        this._expansionCaseStack.push(TokenType.EXPANSION_FORM_START);

        this._beginToken(TokenType.RAW_TEXT);
        const condition = this._readUntil(chars.$COMMA);
        const normalizedCondition = this._processCarriageReturns(condition);
        if (this._i18nNormalizeLineEndingsInICUs) {
            // We explicitly want to normalize line endings for this text.
            this._endToken([normalizedCondition]);
        } else {
            // We are not normalizing line endings.
            const conditionToken = this._endToken([condition]);
            if (normalizedCondition !== condition) {
                this.nonNormalizedIcuExpressions.push(conditionToken);
            }
        }
        this._requireCharCode(chars.$COMMA);
        this._attemptCharCodeUntilFn(isNotWhitespace);

        this._beginToken(TokenType.RAW_TEXT);
        const type = this._readUntil(chars.$COMMA);
        this._endToken([type]);
        this._requireCharCode(chars.$COMMA);
        this._attemptCharCodeUntilFn(isNotWhitespace);
    }

    private _consumeExpansionCaseStart() {
        this._beginToken(TokenType.EXPANSION_CASE_VALUE);
        const value = this._readUntil(chars.$LBRACE).trim();
        this._endToken([value]);
        this._attemptCharCodeUntilFn(isNotWhitespace);

        this._beginToken(TokenType.EXPANSION_CASE_EXP_START);
        this._requireCharCode(chars.$LBRACE);
        this._endToken([]);
        this._attemptCharCodeUntilFn(isNotWhitespace);

        this._expansionCaseStack.push(TokenType.EXPANSION_CASE_EXP_START);
    }

    private _consumeExpansionCaseEnd() {
        this._beginToken(TokenType.EXPANSION_CASE_EXP_END);
        this._requireCharCode(chars.$RBRACE);
        this._endToken([]);
        this._attemptCharCodeUntilFn(isNotWhitespace);

        this._expansionCaseStack.pop();
    }

    private _consumeExpansionFormEnd() {
        this._beginToken(TokenType.EXPANSION_FORM_END);
        this._requireCharCode(chars.$RBRACE);
        this._endToken([]);

        this._expansionCaseStack.pop();
    }

    private _consumeText() {
        const start = this._cursor.clone();
        this._beginToken(TokenType.TEXT, start);
        const parts: string[] = [];

        do {
            if (this._markers && this._attemptStr(this._markers[0])) {
                parts.push(this._markers[0]);
                this._inInterpolation = true;
            } else if (
                this._markers && this._inInterpolation &&
                this._attemptStr(this._markers[1])) {
                parts.push(this._markers[1]);
                this._inInterpolation = false;
            } else {
                parts.push(this._readChar(true));
            }
        } while (!this._isTextEnd());

        // It is possible that an interpolation was started but not ended inside this text token.
        // Make sure that we reset the state of the lexer correctly.
        this._inInterpolation = false;

        this._endToken([this._processCarriageReturns(parts.join(''))]);
    }

    private _isTextEnd(): boolean {
        if (this._isTagStart() || this._cursor.peek() === chars.$EOF) {
            return true;
        }

        if (this._tokenizeIcu && !this._inInterpolation) {
            if (this.isExpansionFormStart()) {
                // start of an expansion form
                return true;
            }

            if (this._cursor.peek() === chars.$RBRACE && this._isInExpansionCase()) {
                // end of and expansion case
                return true;
            }
        }

        return false;
    }

    /**
     * Returns true if the current cursor is pointing to the start of a tag
     * (opening/closing/comments/cdata/etc).
     */
    private _isTagStart(): boolean {
        if (this._cursor.peek() === chars.$LT) {
            // We assume that `<` followed by whitespace is not the start of an HTML element.
            const tmp = this._cursor.clone();
            tmp.advance();
            // If the next character is alphabetic, ! nor / then it is a tag start
            const code = tmp.peek();
            if ((chars.$a <= code && code <= chars.$z) || (chars.$A <= code && code <= chars.$Z) ||
                code === chars.$SLASH || code === chars.$BANG) {
                return true;
            }
        }
        return false;
    }

    private _readUntil(char: number): string {
        const start = this._cursor.clone();
        this._attemptUntilChar(char);
        return this._cursor.getChars(start);
    }

    private _isInExpansionCase(): boolean {
        return this._expansionCaseStack.length > 0 &&
            this._expansionCaseStack[this._expansionCaseStack.length - 1] ===
            TokenType.EXPANSION_CASE_EXP_START;
    }

    private _isInExpansionForm(): boolean {
        return this._expansionCaseStack.length > 0 &&
            this._expansionCaseStack[this._expansionCaseStack.length - 1] ===
            TokenType.EXPANSION_FORM_START;
    }

    private isExpansionFormStart(): boolean {
        if (this._cursor.peek() !== chars.$LBRACE) {
            return false;
        }
        if (this._markers) {
            const start = this._cursor.clone();
            const isInterpolation = this._attemptStr(this._markers[0]);
            this._cursor = start;
            return !isInterpolation;
        }
        return true;
    }
}

function isNotWhitespace(code: number): boolean {
    return !chars.isWhitespace(code) || code === chars.$EOF;
}

function isNameEnd(code: number): boolean {
    return chars.isWhitespace(code) || code === chars.$GT || code === chars.$LT ||
        code === chars.$SLASH || code === chars.$SQ || code === chars.$DQ || code === chars.$EQ ||
        code === chars.$EOF;
}

function isPrefixEnd(code: number): boolean {
    return (code < chars.$a || chars.$z < code) && (code < chars.$A || chars.$Z < code) &&
        (code < chars.$0 || code > chars.$9);
}

function isDigitEntityEnd(code: number): boolean {
    return code == chars.$SEMICOLON || code == chars.$EOF || !chars.isAsciiHexDigit(code);
}

function isNamedEntityEnd(code: number): boolean {
    return code == chars.$SEMICOLON || code == chars.$EOF || !chars.isAsciiLetter(code);
}

function isExpansionCaseStart(peek: number): boolean {
    return peek !== chars.$RBRACE;
}

function compareCharCodeCaseInsensitive(code1: number, code2: number): boolean {
    return toUpperCaseCharCode(code1) == toUpperCaseCharCode(code2);
}

function toUpperCaseCharCode(code: number): number {
    return code >= chars.$a && code <= chars.$z ? code - chars.$a + chars.$A : code;
}

const _CR_OR_CRLF_REGEXP = /\r\n?/g;

function _unexpectedCharacterErrorMsg(charCode: number): string {
  const char = charCode === chars.$EOF ? 'EOF' : String.fromCharCode(charCode);
  return `Unexpected character "${char}"`;
}

function _unknownEntityErrorMsg(entitySrc: string): string {
  return `Unknown entity "${entitySrc}" - use the "&#<decimal>;" or  "&#x<hex>;" syntax`;
}

function _unparsableEntityErrorMsg(type: CharacterReferenceType, entityStr: string): string {
  return `Unable to parse entity "${entityStr}" - ${
      type} character reference entities must end with ";"`;
}

function mergeTextTokens(srcTokens: Tokenize[]): Tokenize[] {
    const dstTokens: Tokenize[] = [];
    let lastDstToken: Tokenize;
    for (let i = 0; i < srcTokens.length; i++) {
        const token = srcTokens[i];
        if (lastDstToken && lastDstToken.type == TokenType.TEXT && token.type == TokenType.TEXT) {
            lastDstToken.parts[0]! += token.parts[0];
            lastDstToken.sourceSpan.end = token.sourceSpan.end;
        } else {
            lastDstToken = token;
            dstTokens.push(lastDstToken);
        }
    }

    return dstTokens;
}


interface CursorState {
    peek: number;
    offset: number;
    line: number;
    column: number;
}

class PlainCharacterCursor implements CharacterCursor {
    protected state: CursorState;
    protected file: ParseSourceFile;
    protected input: string;
    protected end: number;

    constructor(fileOrCursor: PlainCharacterCursor);
    constructor(fileOrCursor: ParseSourceFile, range: LexerRange);
    constructor(fileOrCursor: ParseSourceFile | PlainCharacterCursor, range?: LexerRange) {
        if (fileOrCursor instanceof PlainCharacterCursor) {
            this.file = fileOrCursor.file;
            this.input = fileOrCursor.input;
            this.end = fileOrCursor.end;

            const state = fileOrCursor.state;
            // Note: avoid using `{...fileOrCursor.state}` here as that has a severe performance penalty.
            // In ES5 bundles the object spread operator is translated into the `__assign` helper, which
            // is not optimized by VMs as efficiently as a raw object literal. Since this constructor is
            // called in tight loops, this difference matters.
            this.state = {
                peek: state.peek,
                offset: state.offset,
                line: state.line,
                column: state.column,
            };
        } else {
            if (!range) {
                throw new Error(
                    'Programming error: the range argument must be provided with a file argument.');
            }
            this.file = fileOrCursor;
            this.input = fileOrCursor.content;
            this.end = range.endPos;
            this.state = {
                peek: -1,
                offset: range.startPos,
                line: range.startLine,
                column: range.startCol,
            };
        }
    }

    clone(): PlainCharacterCursor {
        return new PlainCharacterCursor(this);
    }

    peek() {
        return this.state.peek;
    }
    charsLeft() {
        return this.end - this.state.offset;
    }
    diff(other: this) {
        return this.state.offset - other.state.offset;
    }

    advance(): void {
        this.advanceState(this.state);
    }

    init(): void {
        this.updatePeek(this.state);
    }

    getSpan(start?: this, leadingTriviaCodePoints?: number[]): ParseSourceSpan {
        start = start || this;
        let fullStart = start;
        if (leadingTriviaCodePoints) {
            while (this.diff(start) > 0 && leadingTriviaCodePoints.indexOf(start.peek()) !== -1) {
                if (fullStart === start) {
                    start = start.clone() as this;
                }
                start.advance();
            }
        }
        const startLocation = this.locationFromCursor(start);
        const endLocation = this.locationFromCursor(this);
        const fullStartLocation =
            fullStart !== start ? this.locationFromCursor(fullStart) : startLocation;
        return new ParseSourceSpan(startLocation, endLocation, fullStartLocation);
    }

    getChars(start: this): string {
        return this.input.substring(start.state.offset, this.state.offset);
    }

    charAt(pos: number): number {
        return this.input.charCodeAt(pos);
    }

    protected advanceState(state: CursorState) {
        if (state.offset >= this.end) {
            this.state = state;
            throw new CursorError('Unexpected character "EOF"', this);
        }
        const currentChar = this.charAt(state.offset);
        if (currentChar === chars.$LF) {
            state.line++;
            state.column = 0;
        } else if (!chars.isNewLine(currentChar)) {
            state.column++;
        }
        state.offset++;
        this.updatePeek(state);
    }

    protected updatePeek(state: CursorState): void {
        state.peek = state.offset >= this.end ? chars.$EOF : this.charAt(state.offset);
    }

    private locationFromCursor(cursor: this): ParseLocation {
        return new ParseLocation(
            cursor.file, cursor.state.offset, cursor.state.line, cursor.state.column);
    }
}

class EscapedCharacterCursor extends PlainCharacterCursor {
    protected internalState: CursorState;

    constructor(fileOrCursor: EscapedCharacterCursor);
    constructor(fileOrCursor: ParseSourceFile, range: LexerRange);
    constructor(fileOrCursor: ParseSourceFile | EscapedCharacterCursor, range?: LexerRange) {
        if (fileOrCursor instanceof EscapedCharacterCursor) {
            super(fileOrCursor);
            this.internalState = { ...fileOrCursor.internalState };
        } else {
            super(fileOrCursor, range!);
            this.internalState = this.state;
        }
    }

    advance(): void {
        this.state = this.internalState;
        super.advance();
        this.processEscapeSequence();
    }

    init(): void {
        super.init();
        this.processEscapeSequence();
    }

    clone(): EscapedCharacterCursor {
        return new EscapedCharacterCursor(this);
    }

    getChars(start: this): string {
        const cursor = start.clone();
        let chars = '';
        while (cursor.internalState.offset < this.internalState.offset) {
            chars += String.fromCodePoint(cursor.peek());
            cursor.advance();
        }
        return chars;
    }

    /**
     * Process the escape sequence that starts at the current position in the text.
     *
     * This method is called to ensure that `peek` has the unescaped value of escape sequences.
     */
    protected processEscapeSequence(): void {
        const peek = () => this.internalState.peek;

        if (peek() === chars.$BACKSLASH) {
            // We have hit an escape sequence so we need the internal state to become independent
            // of the external state.
            this.internalState = { ...this.state };

            // Move past the backslash
            this.advanceState(this.internalState);

            // First check for standard control char sequences
            if (peek() === chars.$n) {
                this.state.peek = chars.$LF;
            } else if (peek() === chars.$r) {
                this.state.peek = chars.$CR;
            } else if (peek() === chars.$v) {
                this.state.peek = chars.$VTAB;
            } else if (peek() === chars.$t) {
                this.state.peek = chars.$TAB;
            } else if (peek() === chars.$b) {
                this.state.peek = chars.$BSPACE;
            } else if (peek() === chars.$f) {
                this.state.peek = chars.$FF;
            }

            // Now consider more complex sequences
            else if (peek() === chars.$u) {
                // Unicode code-point sequence
                this.advanceState(this.internalState);  // advance past the `u` char
                if (peek() === chars.$LBRACE) {
                    // Variable length Unicode, e.g. `\x{123}`
                    this.advanceState(this.internalState);  // advance past the `{` char
                    // Advance past the variable number of hex digits until we hit a `}` char
                    const digitStart = this.clone();
                    let length = 0;
                    while (peek() !== chars.$RBRACE) {
                        this.advanceState(this.internalState);
                        length++;
                    }
                    this.state.peek = this.decodeHexDigits(digitStart, length);
                } else {
                    // Fixed length Unicode, e.g. `\u1234`
                    const digitStart = this.clone();
                    this.advanceState(this.internalState);
                    this.advanceState(this.internalState);
                    this.advanceState(this.internalState);
                    this.state.peek = this.decodeHexDigits(digitStart, 4);
                }
            }

            else if (peek() === chars.$x) {
                // Hex char code, e.g. `\x2F`
                this.advanceState(this.internalState);  // advance past the `x` char
                const digitStart = this.clone();
                this.advanceState(this.internalState);
                this.state.peek = this.decodeHexDigits(digitStart, 2);
            }

            else if (chars.isOctalDigit(peek())) {
                // Octal char code, e.g. `\012`,
                let octal = '';
                let length = 0;
                let previous = this.clone();
                while (chars.isOctalDigit(peek()) && length < 3) {
                    previous = this.clone();
                    octal += String.fromCodePoint(peek());
                    this.advanceState(this.internalState);
                    length++;
                }
                this.state.peek = parseInt(octal, 8);
                // Backup one char
                this.internalState = previous.internalState;
            }

            else if (chars.isNewLine(this.internalState.peek)) {
                // Line continuation `\` followed by a new line
                this.advanceState(this.internalState);  // advance over the newline
                this.state = this.internalState;
            }

            else {
                // If none of the `if` blocks were executed then we just have an escaped normal character.
                // In that case we just, effectively, skip the backslash from the character.
                this.state.peek = this.internalState.peek;
            }
        }
    }

    protected decodeHexDigits(start: EscapedCharacterCursor, length: number): number {
        const hex = this.input.substr(start.internalState.offset, length);
        const charCode = parseInt(hex, 16);
        if (!isNaN(charCode)) {
            return charCode;
        } else {
            start.state = start.internalState;
            throw new CursorError('Invalid hexadecimal escape sequence', start);
        }
    }
}

export class CursorError {
    constructor(public msg: string, public cursor: CharacterCursor) { }
}


enum CharacterReferenceType {
    HEX = 'hexadecimal',
    DEC = 'decimal',
}

class _ControlFlowError {
    constructor(public error: TokenError) { }
}

// see https://www.w3.org/TR/html51/syntax.html#named-character-references
// see https://html.spec.whatwg.org/multipage/entities.json
// This list is not exhaustive to keep the compiler footprint low.
// The `&#123;` / `&#x1ab;` syntax should be used when the named character reference does not
// exist.
export const NAMED_ENTITIES: {[k: string]: string} = {
    'Aacute': '\u00C1',
    'aacute': '\u00E1',
    'Acirc': '\u00C2',
    'acirc': '\u00E2',
    'acute': '\u00B4',
    'AElig': '\u00C6',
    'aelig': '\u00E6',
    'Agrave': '\u00C0',
    'agrave': '\u00E0',
    'alefsym': '\u2135',
    'Alpha': '\u0391',
    'alpha': '\u03B1',
    'amp': '&',
    'and': '\u2227',
    'ang': '\u2220',
    'apos': '\u0027',
    'Aring': '\u00C5',
    'aring': '\u00E5',
    'asymp': '\u2248',
    'Atilde': '\u00C3',
    'atilde': '\u00E3',
    'Auml': '\u00C4',
    'auml': '\u00E4',
    'bdquo': '\u201E',
    'Beta': '\u0392',
    'beta': '\u03B2',
    'brvbar': '\u00A6',
    'bull': '\u2022',
    'cap': '\u2229',
    'Ccedil': '\u00C7',
    'ccedil': '\u00E7',
    'cedil': '\u00B8',
    'cent': '\u00A2',
    'Chi': '\u03A7',
    'chi': '\u03C7',
    'circ': '\u02C6',
    'clubs': '\u2663',
    'cong': '\u2245',
    'copy': '\u00A9',
    'crarr': '\u21B5',
    'cup': '\u222A',
    'curren': '\u00A4',
    'dagger': '\u2020',
    'Dagger': '\u2021',
    'darr': '\u2193',
    'dArr': '\u21D3',
    'deg': '\u00B0',
    'Delta': '\u0394',
    'delta': '\u03B4',
    'diams': '\u2666',
    'divide': '\u00F7',
    'Eacute': '\u00C9',
    'eacute': '\u00E9',
    'Ecirc': '\u00CA',
    'ecirc': '\u00EA',
    'Egrave': '\u00C8',
    'egrave': '\u00E8',
    'empty': '\u2205',
    'emsp': '\u2003',
    'ensp': '\u2002',
    'Epsilon': '\u0395',
    'epsilon': '\u03B5',
    'equiv': '\u2261',
    'Eta': '\u0397',
    'eta': '\u03B7',
    'ETH': '\u00D0',
    'eth': '\u00F0',
    'Euml': '\u00CB',
    'euml': '\u00EB',
    'euro': '\u20AC',
    'exist': '\u2203',
    'fnof': '\u0192',
    'forall': '\u2200',
    'frac12': '\u00BD',
    'frac14': '\u00BC',
    'frac34': '\u00BE',
    'frasl': '\u2044',
    'Gamma': '\u0393',
    'gamma': '\u03B3',
    'ge': '\u2265',
    'gt': '>',
    'harr': '\u2194',
    'hArr': '\u21D4',
    'hearts': '\u2665',
    'hellip': '\u2026',
    'Iacute': '\u00CD',
    'iacute': '\u00ED',
    'Icirc': '\u00CE',
    'icirc': '\u00EE',
    'iexcl': '\u00A1',
    'Igrave': '\u00CC',
    'igrave': '\u00EC',
    'image': '\u2111',
    'infin': '\u221E',
    'int': '\u222B',
    'Iota': '\u0399',
    'iota': '\u03B9',
    'iquest': '\u00BF',
    'isin': '\u2208',
    'Iuml': '\u00CF',
    'iuml': '\u00EF',
    'Kappa': '\u039A',
    'kappa': '\u03BA',
    'Lambda': '\u039B',
    'lambda': '\u03BB',
    'lang': '\u27E8',
    'laquo': '\u00AB',
    'larr': '\u2190',
    'lArr': '\u21D0',
    'lceil': '\u2308',
    'ldquo': '\u201C',
    'le': '\u2264',
    'lfloor': '\u230A',
    'lowast': '\u2217',
    'loz': '\u25CA',
    'lrm': '\u200E',
    'lsaquo': '\u2039',
    'lsquo': '\u2018',
    'lt': '<',
    'macr': '\u00AF',
    'mdash': '\u2014',
    'micro': '\u00B5',
    'middot': '\u00B7',
    'minus': '\u2212',
    'Mu': '\u039C',
    'mu': '\u03BC',
    'nabla': '\u2207',
    'nbsp': '\u00A0',
    'ndash': '\u2013',
    'ne': '\u2260',
    'ni': '\u220B',
    'not': '\u00AC',
    'notin': '\u2209',
    'nsub': '\u2284',
    'Ntilde': '\u00D1',
    'ntilde': '\u00F1',
    'Nu': '\u039D',
    'nu': '\u03BD',
    'Oacute': '\u00D3',
    'oacute': '\u00F3',
    'Ocirc': '\u00D4',
    'ocirc': '\u00F4',
    'OElig': '\u0152',
    'oelig': '\u0153',
    'Ograve': '\u00D2',
    'ograve': '\u00F2',
    'oline': '\u203E',
    'Omega': '\u03A9',
    'omega': '\u03C9',
    'Omicron': '\u039F',
    'omicron': '\u03BF',
    'oplus': '\u2295',
    'or': '\u2228',
    'ordf': '\u00AA',
    'ordm': '\u00BA',
    'Oslash': '\u00D8',
    'oslash': '\u00F8',
    'Otilde': '\u00D5',
    'otilde': '\u00F5',
    'otimes': '\u2297',
    'Ouml': '\u00D6',
    'ouml': '\u00F6',
    'para': '\u00B6',
    'permil': '\u2030',
    'perp': '\u22A5',
    'Phi': '\u03A6',
    'phi': '\u03C6',
    'Pi': '\u03A0',
    'pi': '\u03C0',
    'piv': '\u03D6',
    'plusmn': '\u00B1',
    'pound': '\u00A3',
    'prime': '\u2032',
    'Prime': '\u2033',
    'prod': '\u220F',
    'prop': '\u221D',
    'Psi': '\u03A8',
    'psi': '\u03C8',
    'quot': '\u0022',
    'radic': '\u221A',
    'rang': '\u27E9',
    'raquo': '\u00BB',
    'rarr': '\u2192',
    'rArr': '\u21D2',
    'rceil': '\u2309',
    'rdquo': '\u201D',
    'real': '\u211C',
    'reg': '\u00AE',
    'rfloor': '\u230B',
    'Rho': '\u03A1',
    'rho': '\u03C1',
    'rlm': '\u200F',
    'rsaquo': '\u203A',
    'rsquo': '\u2019',
    'sbquo': '\u201A',
    'Scaron': '\u0160',
    'scaron': '\u0161',
    'sdot': '\u22C5',
    'sect': '\u00A7',
    'shy': '\u00AD',
    'Sigma': '\u03A3',
    'sigma': '\u03C3',
    'sigmaf': '\u03C2',
    'sim': '\u223C',
    'spades': '\u2660',
    'sub': '\u2282',
    'sube': '\u2286',
    'sum': '\u2211',
    'sup': '\u2283',
    'sup1': '\u00B9',
    'sup2': '\u00B2',
    'sup3': '\u00B3',
    'supe': '\u2287',
    'szlig': '\u00DF',
    'Tau': '\u03A4',
    'tau': '\u03C4',
    'there4': '\u2234',
    'Theta': '\u0398',
    'theta': '\u03B8',
    'thetasym': '\u03D1',
    'thinsp': '\u2009',
    'THORN': '\u00DE',
    'thorn': '\u00FE',
    'tilde': '\u02DC',
    'times': '\u00D7',
    'trade': '\u2122',
    'Uacute': '\u00DA',
    'uacute': '\u00FA',
    'uarr': '\u2191',
    'uArr': '\u21D1',
    'Ucirc': '\u00DB',
    'ucirc': '\u00FB',
    'Ugrave': '\u00D9',
    'ugrave': '\u00F9',
    'uml': '\u00A8',
    'upsih': '\u03D2',
    'Upsilon': '\u03A5',
    'upsilon': '\u03C5',
    'Uuml': '\u00DC',
    'uuml': '\u00FC',
    'weierp': '\u2118',
    'Xi': '\u039E',
    'xi': '\u03BE',
    'Yacute': '\u00DD',
    'yacute': '\u00FD',
    'yen': '\u00A5',
    'yuml': '\u00FF',
    'Yuml': '\u0178',
    'Zeta': '\u0396',
    'zeta': '\u03B6',
    'zwj': '\u200D',
    'zwnj': '\u200C',
  };
