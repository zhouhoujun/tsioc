/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as chars from '../chars';
import { DEFAULT_MARKERS, Markers } from '../util';
import { AbsoluteSourceSpan, AST, AstVisitor, ASTWithSource, Binary, BindingPipe, Chain, Conditional, EmptyExpr, ExpressionBinding, FunctionCall, ImplicitReceiver, Interpolation, KeyedRead, KeyedWrite, LiteralArray, LiteralMap, LiteralMapKey, LiteralPrimitive, MethodCall, NonNullAssert, ParserError, ParseSpan, PrefixNot, PropertyRead, PropertyWrite, Quote, RecursiveAstVisitor, SafeKeyedRead, SafeMethodCall, SafePropertyRead, TemplateBinding, TemplateBindingIdentifier, ThisReceiver, Unary, VariableBinding } from './ast';
import { EOF, isIdentifier, Lexer, Token, TokenType } from './lexer';

export interface InterpolationPiece {
  text: string;
  start: number;
  end: number;
}
export class SplitInterpolation {
  constructor(
    public strings: InterpolationPiece[], public expressions: InterpolationPiece[],
    public offsets: number[]) { }
}

export class TemplateBindingParseResult {
  constructor(
    public templateBindings: TemplateBinding[], public warnings: string[],
    public errors: ParserError[]) { }
}

export class Parser {
  private errors: ParserError[] = [];

  constructor(private _lexer: Lexer) { }

  simpleExpressionChecker = SimpleExpressionChecker;

  parseAction(
    input: string, location: string, absoluteOffset: number,
    markers: Markers = DEFAULT_MARKERS): ASTWithSource {
    this._checkNoInterpolation(input, location, markers);
    const sourceToLex = this._stripComments(input);
    const tokens = this._lexer.tokenize(this._stripComments(input));
    const ast = new _ParseAST(
      input, location, absoluteOffset, tokens, sourceToLex.length, true, this.errors,
      input.length - sourceToLex.length)
      .parseChain();
    return new ASTWithSource(ast, input, location, absoluteOffset, this.errors);
  }

  parseBinding(
    input: string, location: string, absoluteOffset: number,
    markers: Markers = DEFAULT_MARKERS): ASTWithSource {
    const ast = this._parseBindingAst(input, location, absoluteOffset, markers);
    return new ASTWithSource(ast, input, location, absoluteOffset, this.errors);
  }

  private checkSimpleExpression(ast: AST): string[] {
    const checker = new this.simpleExpressionChecker();
    ast.visit(checker);
    return checker.errors;
  }

  parseSimpleBinding(
    input: string, location: string, absoluteOffset: number,
    markers: Markers = DEFAULT_MARKERS): ASTWithSource {
    const ast = this._parseBindingAst(input, location, absoluteOffset, markers);
    const errors = this.checkSimpleExpression(ast);
    if (errors.length > 0) {
      this._reportError(
        `Host binding expression cannot contain ${errors.join(' ')}`, input, location);
    }
    return new ASTWithSource(ast, input, location, absoluteOffset, this.errors);
  }

  private _reportError(message: string, input: string, errLocation: string, ctxLocation?: string) {
    this.errors.push(new ParserError(message, input, errLocation, ctxLocation));
  }

  private _parseBindingAst(
    input: string, location: string, absoluteOffset: number,
    markers: Markers): AST {
    // Quotes expressions use 3rd-party expression language. We don't want to use
    // our lexer or parser for that, so we check for that ahead of time.
    const quote = this._parseQuote(input, location, absoluteOffset);

    if (quote != null) {
      return quote;
    }

    this._checkNoInterpolation(input, location, markers);
    const sourceToLex = this._stripComments(input);
    const tokens = this._lexer.tokenize(sourceToLex);
    return new _ParseAST(
      input, location, absoluteOffset, tokens, sourceToLex.length, false, this.errors,
      input.length - sourceToLex.length)
      .parseChain();
  }

  private _parseQuote(input: string | null, location: string, absoluteOffset: number): AST | null {
    if (input == null) return null;
    const prefixSeparatorIndex = input.indexOf(':');
    if (prefixSeparatorIndex == -1) return null;
    const prefix = input.substring(0, prefixSeparatorIndex).trim();
    if (!isIdentifier(prefix)) return null;
    const uninterpretedExpression = input.substring(prefixSeparatorIndex + 1);
    const span = new ParseSpan(0, input.length);
    return new Quote(
      span, span.toAbsolute(absoluteOffset), prefix, uninterpretedExpression, location);
  }

  /**
   * Parse microsyntax template expression and return a list of bindings or
   * parsing errors in case the given expression is invalid.
   *
   * For example,
   * ```
   *   <div *for="let item of items">
   *         ^      ^ absoluteValueOffset for `templateValue`
   *         absoluteKeyOffset for `templateKey`
   * ```
   * contains three bindings:
   * 1. for -> null
   * 2. item -> ForOfContext.$implicit
   * 3. forOf -> items
   *
   * This is apparent from the de-sugared template:
   * ```
   *   <ng-template for let-item [forOf]="items">
   * ```
   *
   * @param templateKey name of directive, without the * prefix. For example: if, for
   * @param templateValue RHS of the microsyntax attribute
   * @param templateUrl template filename if it's external, component filename if it's inline
   * @param absoluteKeyOffset start of the `templateKey`
   * @param absoluteValueOffset start of the `templateValue`
   */
  parseTemplateBindings(
    templateKey: string, templateValue: string, templateUrl: string, absoluteKeyOffset: number,
    absoluteValueOffset: number): TemplateBindingParseResult {
    const tokens = this._lexer.tokenize(templateValue);
    const parser = new _ParseAST(
      templateValue, templateUrl, absoluteValueOffset, tokens, templateValue.length,
      false /* parseAction */, this.errors, 0 /* relative offset */);
    return parser.parseTemplateBindings({
      source: templateKey,
      span: new AbsoluteSourceSpan(absoluteKeyOffset, absoluteKeyOffset + templateKey.length),
    });
  }

  parseInterpolation(
    input: string, location: string, absoluteOffset: number,
    markers: Markers = DEFAULT_MARKERS): ASTWithSource | null {
    const { strings, expressions, offsets } =
      this.splitInterpolation(input, location, markers);
    if (expressions.length === 0) return null;

    const expressionNodes: AST[] = [];

    for (let i = 0; i < expressions.length; ++i) {
      const expressionText = expressions[i].text;
      const sourceToLex = this._stripComments(expressionText);
      const tokens = this._lexer.tokenize(sourceToLex);
      const ast = new _ParseAST(
        input, location, absoluteOffset, tokens, sourceToLex.length, false,
        this.errors, offsets[i] + (expressionText.length - sourceToLex.length))
        .parseChain();
      expressionNodes.push(ast);
    }

    return this.createInterpolationAst(
      strings.map(s => s.text), expressionNodes, input, location, absoluteOffset);
  }

  /**
   * Similar to `parseInterpolation`, but treats the provided string as a single expression
   * element that would normally appear within the interpolation prefix and suffix (`{{` and `}}`).
   * This is used for parsing the switch expression in ICUs.
   */
  parseInterpolationExpression(expression: string, location: string, absoluteOffset: number):
    ASTWithSource {
    const sourceToLex = this._stripComments(expression);
    const tokens = this._lexer.tokenize(sourceToLex);
    const ast = new _ParseAST(
      expression, location, absoluteOffset, tokens, sourceToLex.length,
                     /* parseAction */ false, this.errors, 0)
      .parseChain();
    const strings = ['', ''];  // The prefix and suffix strings are both empty
    return this.createInterpolationAst(strings, [ast], expression, location, absoluteOffset);
  }

  private createInterpolationAst(
    strings: string[], expressions: AST[], input: string, location: string,
    absoluteOffset: number): ASTWithSource {
    const span = new ParseSpan(0, input.length);
    const interpolation =
      new Interpolation(span, span.toAbsolute(absoluteOffset), strings, expressions);
    return new ASTWithSource(interpolation, input, location, absoluteOffset, this.errors);
  }

  /**
   * Splits a string of text into "raw" text segments and expressions present in interpolations in
   * the string.
   * Returns `null` if there are no interpolations, otherwise a
   * `SplitInterpolation` with splits that look like
   *   <raw text> <expression> <raw text> ... <raw text> <expression> <raw text>
   */
  splitInterpolation(
    input: string, location: string,
    markers: Markers = DEFAULT_MARKERS): SplitInterpolation {
    const strings: InterpolationPiece[] = [];
    const expressions: InterpolationPiece[] = [];
    const offsets: number[] = [];
    let i = 0;
    let atInterpolation = false;
    let extendLastString = false;
    let { start: interpStart, end: interpEnd } = markers;
    while (i < input.length) {
      if (!atInterpolation) {
        // parse until starting {{
        const start = i;
        i = input.indexOf(interpStart, i);
        if (i === -1) {
          i = input.length;
        }
        const text = input.substring(start, i);
        strings.push({ text, start, end: i });

        atInterpolation = true;
      } else {
        // parse from starting {{ to ending }} while ignoring content inside quotes.
        const fullStart = i;
        const exprStart = fullStart + interpStart.length;
        const exprEnd = this._getInterpolationEndIndex(input, interpEnd, exprStart);
        if (exprEnd === -1) {
          // Could not find the end of the interpolation; do not parse an expression.
          // Instead we should extend the content on the last raw string.
          atInterpolation = false;
          extendLastString = true;
          break;
        }
        const fullEnd = exprEnd + interpEnd.length;

        const text = input.substring(exprStart, exprEnd);
        if (text.trim().length === 0) {
          this._reportError(
            'Blank expressions are not allowed in interpolated strings', input,
            `at column ${i} in`, location);
        }
        expressions.push({ text, start: fullStart, end: fullEnd });
        offsets.push(exprStart);

        i = fullEnd;
        atInterpolation = false;
      }
    }
    if (!atInterpolation) {
      // If we are now at a text section, add the remaining content as a raw string.
      if (extendLastString) {
        const piece = strings[strings.length - 1];
        piece.text += input.substring(i);
        piece.end = input.length;
      } else {
        strings.push({ text: input.substring(i), start: i, end: input.length });
      }
    }
    return new SplitInterpolation(strings, expressions, offsets);
  }

  wrapLiteralPrimitive(input: string | null, location: string, absoluteOffset: number):
    ASTWithSource {
    const span = new ParseSpan(0, input == null ? 0 : input.length);
    return new ASTWithSource(
      new LiteralPrimitive(span, span.toAbsolute(absoluteOffset), input), input, location,
      absoluteOffset, this.errors);
  }

  private _stripComments(input: string): string {
    const i = this._commentStart(input);
    return i != null ? input.substring(0, i).trim() : input;
  }

  private _commentStart(input: string): number | null {
    let outerQuote: number | null = null;
    for (let i = 0; i < input.length - 1; i++) {
      const char = input.charCodeAt(i);
      const nextChar = input.charCodeAt(i + 1);

      if (char === chars.$SLASH && nextChar == chars.$SLASH && outerQuote == null) return i;

      if (outerQuote === char) {
        outerQuote = null;
      } else if (outerQuote == null && chars.isQuote(char)) {
        outerQuote = char;
      }
    }
    return null;
  }

  private _checkNoInterpolation(input: string, location: string, { start, end }: Markers):
    void {
    let startIndex = -1;
    let endIndex = -1;

    for (const charIndex of this._forEachUnquotedChar(input, 0)) {
      if (startIndex === -1) {
        if (input.startsWith(start)) {
          startIndex = charIndex;
        }
      } else {
        endIndex = this._getInterpolationEndIndex(input, end, charIndex);
        if (endIndex > -1) {
          break;
        }
      }
    }

    if (startIndex > -1 && endIndex > -1) {
      this._reportError(
        `Got interpolation (${start}${end}) where expression was expected`, input,
        `at column ${startIndex} in`, location);
    }
  }

  /**
   * Finds the index of the end of an interpolation expression
   * while ignoring comments and quoted content.
   */
  private _getInterpolationEndIndex(input: string, expressionEnd: string, start: number): number {
    for (const charIndex of this._forEachUnquotedChar(input, start)) {
      if (input.startsWith(expressionEnd, charIndex)) {
        return charIndex;
      }

      // Nothing else in the expression matters after we've
      // hit a comment so look directly for the end token.
      if (input.startsWith('//', charIndex)) {
        return input.indexOf(expressionEnd, charIndex);
      }
    }

    return -1;
  }

  /**
   * Generator used to iterate over the character indexes of a string that are outside of quotes.
   * @param input String to loop through.
   * @param start Index within the string at which to start.
   */
  private * _forEachUnquotedChar(input: string, start: number) {
    let currentQuote: string | null = null;
    let escapeCount = 0;
    for (let i = start; i < input.length; i++) {
      const char = input[i];
      // Skip the characters inside quotes. Note that we only care about the outer-most
      // quotes matching up and we need to account for escape characters.
      if (chars.isQuote(input.charCodeAt(i)) && (currentQuote === null || currentQuote === char) &&
        escapeCount % 2 === 0) {
        currentQuote = currentQuote === null ? char : null;
      } else if (currentQuote === null) {
        yield i;
      }
      escapeCount = char === '\\' ? escapeCount + 1 : 0;
    }
  }
}

export class IvyParser extends Parser {
  override simpleExpressionChecker = IvySimpleExpressionChecker;
}

/** Describes a stateful context an expression parser is in. */
enum ParseContextFlags {
  None = 0,
  /**
   * A Writable context is one in which a value may be written to an lvalue.
   * For example, after we see a property access, we may expect a write to the
   * property via the "=" operator.
   *   prop
   *        ^ possible "=" after
   */
  Writable = 1,
}

export class _ParseAST {
  private rparensExpected = 0;
  private rbracketsExpected = 0;
  private rbracesExpected = 0;
  private context = ParseContextFlags.None;

  // Cache of expression start and input indeces to the absolute source span they map to, used to
  // prevent creating superfluous source spans in `sourceSpan`.
  // A serial of the expression start and input index is used for mapping because both are stateful
  // and may change for subsequent expressions visited by the parser.
  private sourceSpanCache = new Map<string, AbsoluteSourceSpan>();

  index: number = 0;

  constructor(
    public input: string, public location: string, public absoluteOffset: number,
    public tokens: Token[], public inputLength: number, public parseAction: boolean,
    private errors: ParserError[], private offset: number) { }

  peek(offset: number): Token {
    const i = this.index + offset;
    return i < this.tokens.length ? this.tokens[i] : EOF;
  }

  get next(): Token {
    return this.peek(0);
  }

  /** Whether all the parser input has been processed. */
  get atEOF(): boolean {
    return this.index >= this.tokens.length;
  }

  /**
   * Index of the next token to be processed, or the end of the last token if all have been
   * processed.
   */
  get inputIndex(): number {
    return this.atEOF ? this.currentEndIndex : this.next.index + this.offset;
  }

  /**
   * End index of the last processed token, or the start of the first token if none have been
   * processed.
   */
  get currentEndIndex(): number {
    if (this.index > 0) {
      const curToken = this.peek(-1);
      return curToken.end + this.offset;
    }
    // No tokens have been processed yet; return the next token's start or the length of the input
    // if there is no token.
    if (this.tokens.length === 0) {
      return this.inputLength + this.offset;
    }
    return this.next.index + this.offset;
  }

  /**
   * Returns the absolute offset of the start of the current token.
   */
  get currentAbsoluteOffset(): number {
    return this.absoluteOffset + this.inputIndex;
  }

  /**
   * Retrieve a `ParseSpan` from `start` to the current position (or to `artificialEndIndex` if
   * provided).
   *
   * @param start Position from which the `ParseSpan` will start.
   * @param artificialEndIndex Optional ending index to be used if provided (and if greater than the
   *     natural ending index)
   */
  span(start: number, artificialEndIndex?: number): ParseSpan {
    let endIndex = this.currentEndIndex;
    if (artificialEndIndex !== undefined && artificialEndIndex > this.currentEndIndex) {
      endIndex = artificialEndIndex;
    }

    // In some unusual parsing scenarios (like when certain tokens are missing and an `EmptyExpr` is
    // being created), the current token may already be advanced beyond the `currentEndIndex`. This
    // appears to be a deep-seated parser bug.
    //
    // As a workaround for now, swap the start and end indices to ensure a valid `ParseSpan`.
    // TODO(alxhub): fix the bug upstream in the parser state, and remove this workaround.
    if (start > endIndex) {
      const tmp = endIndex;
      endIndex = start;
      start = tmp;
    }

    return new ParseSpan(start, endIndex);
  }

  sourceSpan(start: number, artificialEndIndex?: number): AbsoluteSourceSpan {
    const serial = `${start}@${this.inputIndex}:${artificialEndIndex}`;
    if (!this.sourceSpanCache.has(serial)) {
      this.sourceSpanCache.set(
        serial, this.span(start, artificialEndIndex).toAbsolute(this.absoluteOffset));
    }
    return this.sourceSpanCache.get(serial)!;
  }

  advance() {
    this.index++;
  }

  /**
   * Executes a callback in the provided context.
   */
  private withContext<T>(context: ParseContextFlags, cb: () => T): T {
    this.context |= context;
    const ret = cb();
    this.context ^= context;
    return ret;
  }

  consumeOptionalCharacter(code: number): boolean {
    if (this.next.isCharacter(code)) {
      this.advance();
      return true;
    } else {
      return false;
    }
  }

  peekKeywordLet(): boolean {
    return this.next.isKeywordLet();
  }
  peekKeywordAs(): boolean {
    return this.next.isKeywordAs();
  }

  /**
   * Consumes an expected character, otherwise emits an error about the missing expected character
   * and skips over the token stream until reaching a recoverable point.
   *
   * See `this.error` and `this.skip` for more details.
   */
  expectCharacter(code: number) {
    if (this.consumeOptionalCharacter(code)) return;
    this.error(`Missing expected ${String.fromCharCode(code)}`);
  }

  consumeOptionalOperator(op: string): boolean {
    if (this.next.isOperator(op)) {
      this.advance();
      return true;
    } else {
      return false;
    }
  }

  expectOperator(operator: string) {
    if (this.consumeOptionalOperator(operator)) return;
    this.error(`Missing expected operator ${operator}`);
  }

  prettyPrintToken(tok: Token): string {
    return tok === EOF ? 'end of input' : `token ${tok}`;
  }

  expectIdentifierOrKeyword(): string | null {
    const n = this.next;
    if (!n.isIdentifier() && !n.isKeyword()) {
      if (n.isPrivateIdentifier()) {
        this._reportErrorForPrivateIdentifier(n, 'expected identifier or keyword');
      } else {
        this.error(`Unexpected ${this.prettyPrintToken(n)}, expected identifier or keyword`);
      }
      return null;
    }
    this.advance();
    return n.toString() as string;
  }

  expectIdentifierOrKeywordOrString(): string {
    const n = this.next;
    if (!n.isIdentifier() && !n.isKeyword() && !n.isString()) {
      if (n.isPrivateIdentifier()) {
        this._reportErrorForPrivateIdentifier(n, 'expected identifier, keyword or string');
      } else {
        this.error(
          `Unexpected ${this.prettyPrintToken(n)}, expected identifier, keyword, or string`);
      }
      return '';
    }
    this.advance();
    return n.toString() as string;
  }

  parseChain(): AST {
    const exprs: AST[] = [];
    const start = this.inputIndex;
    while (this.index < this.tokens.length) {
      const expr = this.parsePipe();
      exprs.push(expr);

      if (this.consumeOptionalCharacter(chars.$SEMICOLON)) {
        if (!this.parseAction) {
          this.error('Binding expression cannot contain chained expression');
        }
        while (this.consumeOptionalCharacter(chars.$SEMICOLON)) {
        }  // read all semicolons
      } else if (this.index < this.tokens.length) {
        this.error(`Unexpected token '${this.next}'`);
      }
    }
    if (exprs.length == 0) {
      // We have no expressions so create an empty expression that spans the entire input length
      const artificialStart = this.offset;
      const artificialEnd = this.offset + this.inputLength;
      return new EmptyExpr(
        this.span(artificialStart, artificialEnd),
        this.sourceSpan(artificialStart, artificialEnd));
    }
    if (exprs.length == 1) return exprs[0];
    return new Chain(this.span(start), this.sourceSpan(start), exprs);
  }

  parsePipe(): AST {
    const start = this.inputIndex;
    let result = this.parseExpression();
    if (this.consumeOptionalOperator('|')) {
      if (this.parseAction) {
        this.error('Cannot have a pipe in an action expression');
      }

      do {
        const nameStart = this.inputIndex;
        let nameId = this.expectIdentifierOrKeyword();
        let nameSpan: AbsoluteSourceSpan;
        let fullSpanEnd: number | undefined = undefined;
        if (nameId !== null) {
          nameSpan = this.sourceSpan(nameStart);
        } else {
          // No valid identifier was found, so we'll assume an empty pipe name ('').
          nameId = '';

          // However, there may have been whitespace present between the pipe character and the next
          // token in the sequence (or the end of input). We want to track this whitespace so that
          // the `BindingPipe` we produce covers not just the pipe character, but any trailing
          // whitespace beyond it. Another way of thinking about this is that the zero-length name
          // is assumed to be at the end of any whitespace beyond the pipe character.
          //
          // Therefore, we push the end of the `ParseSpan` for this pipe all the way up to the
          // beginning of the next token, or until the end of input if the next token is EOF.
          fullSpanEnd = this.next.index !== -1 ? this.next.index : this.inputLength + this.offset;

          // The `nameSpan` for an empty pipe name is zero-length at the end of any whitespace
          // beyond the pipe character.
          nameSpan = new ParseSpan(fullSpanEnd, fullSpanEnd).toAbsolute(this.absoluteOffset);
        }

        const args: AST[] = [];
        while (this.consumeOptionalCharacter(chars.$COLON)) {
          args.push(this.parseExpression());

          // If there are additional expressions beyond the name, then the artificial end for the
          // name is no longer relevant.
        }
        result = new BindingPipe(
          this.span(start), this.sourceSpan(start, fullSpanEnd), result, nameId, args, nameSpan);
      } while (this.consumeOptionalOperator('|'));
    }

    return result;
  }

  parseExpression(): AST {
    return this.parseConditional();
  }

  parseConditional(): AST {
    const start = this.inputIndex;
    const result = this.parseLogicalOr();

    if (this.consumeOptionalOperator('?')) {
      const yes = this.parsePipe();
      let no: AST;
      if (!this.consumeOptionalCharacter(chars.$COLON)) {
        const end = this.inputIndex;
        const expression = this.input.substring(start, end);
        this.error(`Conditional expression ${expression} requires all 3 expressions`);
        no = new EmptyExpr(this.span(start), this.sourceSpan(start));
      } else {
        no = this.parsePipe();
      }
      return new Conditional(this.span(start), this.sourceSpan(start), result, yes, no);
    } else {
      return result;
    }
  }

  parseLogicalOr(): AST {
    // '||'
    const start = this.inputIndex;
    let result = this.parseLogicalAnd();
    while (this.consumeOptionalOperator('||')) {
      const right = this.parseLogicalAnd();
      result = new Binary(this.span(start), this.sourceSpan(start), '||', result, right);
    }
    return result;
  }

  parseLogicalAnd(): AST {
    // '&&'
    const start = this.inputIndex;
    let result = this.parseNullishCoalescing();
    while (this.consumeOptionalOperator('&&')) {
      const right = this.parseNullishCoalescing();
      result = new Binary(this.span(start), this.sourceSpan(start), '&&', result, right);
    }
    return result;
  }

  parseNullishCoalescing(): AST {
    // '??'
    const start = this.inputIndex;
    let result = this.parseEquality();
    while (this.consumeOptionalOperator('??')) {
      const right = this.parseEquality();
      result = new Binary(this.span(start), this.sourceSpan(start), '??', result, right);
    }
    return result;
  }

  parseEquality(): AST {
    // '==','!=','===','!=='
    const start = this.inputIndex;
    let result = this.parseRelational();
    while (this.next.type == TokenType.Operator) {
      const operator = this.next.strValue;
      switch (operator) {
        case '==':
        case '===':
        case '!=':
        case '!==':
          this.advance();
          const right = this.parseRelational();
          result = new Binary(this.span(start), this.sourceSpan(start), operator, result, right);
          continue;
      }
      break;
    }
    return result;
  }

  parseRelational(): AST {
    // '<', '>', '<=', '>='
    const start = this.inputIndex;
    let result = this.parseAdditive();
    while (this.next.type == TokenType.Operator) {
      const operator = this.next.strValue;
      switch (operator) {
        case '<':
        case '>':
        case '<=':
        case '>=':
          this.advance();
          const right = this.parseAdditive();
          result = new Binary(this.span(start), this.sourceSpan(start), operator, result, right);
          continue;
      }
      break;
    }
    return result;
  }

  parseAdditive(): AST {
    // '+', '-'
    const start = this.inputIndex;
    let result = this.parseMultiplicative();
    while (this.next.type == TokenType.Operator) {
      const operator = this.next.strValue;
      switch (operator) {
        case '+':
        case '-':
          this.advance();
          let right = this.parseMultiplicative();
          result = new Binary(this.span(start), this.sourceSpan(start), operator, result, right);
          continue;
      }
      break;
    }
    return result;
  }

  parseMultiplicative(): AST {
    // '*', '%', '/'
    const start = this.inputIndex;
    let result = this.parsePrefix();
    while (this.next.type == TokenType.Operator) {
      const operator = this.next.strValue;
      switch (operator) {
        case '*':
        case '%':
        case '/':
          this.advance();
          let right = this.parsePrefix();
          result = new Binary(this.span(start), this.sourceSpan(start), operator, result, right);
          continue;
      }
      break;
    }
    return result;
  }

  parsePrefix(): AST {
    if (this.next.type == TokenType.Operator) {
      const start = this.inputIndex;
      const operator = this.next.strValue;
      let result: AST;
      switch (operator) {
        case '+':
          this.advance();
          result = this.parsePrefix();
          return Unary.createPlus(this.span(start), this.sourceSpan(start), result);
        case '-':
          this.advance();
          result = this.parsePrefix();
          return Unary.createMinus(this.span(start), this.sourceSpan(start), result);
        case '!':
          this.advance();
          result = this.parsePrefix();
          return new PrefixNot(this.span(start), this.sourceSpan(start), result);
      }
    }
    return this.parseCallChain();
  }

  parseCallChain(): AST {
    const start = this.inputIndex;
    let result = this.parsePrimary();
    while (true) {
      if (this.consumeOptionalCharacter(chars.$PERIOD)) {
        result = this.parseAccessMemberOrMethodCall(result, start, false);

      } else if (this.consumeOptionalOperator('?.')) {
        result = this.consumeOptionalCharacter(chars.$LBRACKET) ?
          this.parseKeyedReadOrWrite(result, start, true) :
          this.parseAccessMemberOrMethodCall(result, start, true);
      } else if (this.consumeOptionalCharacter(chars.$LBRACKET)) {
        result = this.parseKeyedReadOrWrite(result, start, false);
      } else if (this.consumeOptionalCharacter(chars.$LPAREN)) {
        this.rparensExpected++;
        const args = this.parseCallArguments();
        this.rparensExpected--;
        this.expectCharacter(chars.$RPAREN);
        result = new FunctionCall(this.span(start), this.sourceSpan(start), result, args);

      } else if (this.consumeOptionalOperator('!')) {
        result = new NonNullAssert(this.span(start), this.sourceSpan(start), result);

      } else {
        return result;
      }
    }
  }

  parsePrimary(): AST {
    const start = this.inputIndex;
    if (this.consumeOptionalCharacter(chars.$LPAREN)) {
      this.rparensExpected++;
      const result = this.parsePipe();
      this.rparensExpected--;
      this.expectCharacter(chars.$RPAREN);
      return result;

    } else if (this.next.isKeywordNull()) {
      this.advance();
      return new LiteralPrimitive(this.span(start), this.sourceSpan(start), null);

    } else if (this.next.isKeywordUndefined()) {
      this.advance();
      return new LiteralPrimitive(this.span(start), this.sourceSpan(start), void 0);

    } else if (this.next.isKeywordTrue()) {
      this.advance();
      return new LiteralPrimitive(this.span(start), this.sourceSpan(start), true);

    } else if (this.next.isKeywordFalse()) {
      this.advance();
      return new LiteralPrimitive(this.span(start), this.sourceSpan(start), false);

    } else if (this.next.isKeywordThis()) {
      this.advance();
      return new ThisReceiver(this.span(start), this.sourceSpan(start));
    } else if (this.consumeOptionalCharacter(chars.$LBRACKET)) {
      this.rbracketsExpected++;
      const elements = this.parseExpressionList(chars.$RBRACKET);
      this.rbracketsExpected--;
      this.expectCharacter(chars.$RBRACKET);
      return new LiteralArray(this.span(start), this.sourceSpan(start), elements);

    } else if (this.next.isCharacter(chars.$LBRACE)) {
      return this.parseLiteralMap();

    } else if (this.next.isIdentifier()) {
      return this.parseAccessMemberOrMethodCall(
        new ImplicitReceiver(this.span(start), this.sourceSpan(start)), start, false);

    } else if (this.next.isNumber()) {
      const value = this.next.toNumber();
      this.advance();
      return new LiteralPrimitive(this.span(start), this.sourceSpan(start), value);

    } else if (this.next.isString()) {
      const literalValue = this.next.toString();
      this.advance();
      return new LiteralPrimitive(this.span(start), this.sourceSpan(start), literalValue);

    } else if (this.next.isPrivateIdentifier()) {
      this._reportErrorForPrivateIdentifier(this.next, null);
      return new EmptyExpr(this.span(start), this.sourceSpan(start));

    } else if (this.index >= this.tokens.length) {
      this.error(`Unexpected end of expression: ${this.input}`);
      return new EmptyExpr(this.span(start), this.sourceSpan(start));
    } else {
      this.error(`Unexpected token ${this.next}`);
      return new EmptyExpr(this.span(start), this.sourceSpan(start));
    }
  }

  parseExpressionList(terminator: number): AST[] {
    const result: AST[] = [];

    do {
      if (!this.next.isCharacter(terminator)) {
        result.push(this.parsePipe());
      } else {
        break;
      }
    } while (this.consumeOptionalCharacter(chars.$COMMA));
    return result;
  }

  parseLiteralMap(): LiteralMap {
    const keys: LiteralMapKey[] = [];
    const values: AST[] = [];
    const start = this.inputIndex;
    this.expectCharacter(chars.$LBRACE);
    if (!this.consumeOptionalCharacter(chars.$RBRACE)) {
      this.rbracesExpected++;
      do {
        const keyStart = this.inputIndex;
        const quoted = this.next.isString();
        const key = this.expectIdentifierOrKeywordOrString();
        keys.push({ key, quoted });

        // Properties with quoted keys can't use the shorthand syntax.
        if (quoted) {
          this.expectCharacter(chars.$COLON);
          values.push(this.parsePipe());
        } else if (this.consumeOptionalCharacter(chars.$COLON)) {
          values.push(this.parsePipe());
        } else {
          const span = this.span(keyStart);
          const sourceSpan = this.sourceSpan(keyStart);
          values.push(new PropertyRead(
            span, sourceSpan, sourceSpan, new ImplicitReceiver(span, sourceSpan), key));
        }
      } while (this.consumeOptionalCharacter(chars.$COMMA));
      this.rbracesExpected--;
      this.expectCharacter(chars.$RBRACE);
    }
    return new LiteralMap(this.span(start), this.sourceSpan(start), keys, values);
  }

  parseAccessMemberOrMethodCall(receiver: AST, start: number, isSafe: boolean): AST {
    const nameStart = this.inputIndex;
    const id = this.withContext(ParseContextFlags.Writable, () => {
      const id = this.expectIdentifierOrKeyword() ?? '';
      if (id.length === 0) {
        this.error(`Expected identifier for property access`, receiver.span.end);
      }
      return id;
    });
    const nameSpan = this.sourceSpan(nameStart);

    if (this.consumeOptionalCharacter(chars.$LPAREN)) {
      const argumentStart = this.inputIndex;
      this.rparensExpected++;
      const args = this.parseCallArguments();
      const argumentSpan =
        this.span(argumentStart, this.inputIndex).toAbsolute(this.absoluteOffset);

      this.expectCharacter(chars.$RPAREN);
      this.rparensExpected--;
      const span = this.span(start);
      const sourceSpan = this.sourceSpan(start);
      return isSafe ?
        new SafeMethodCall(span, sourceSpan, nameSpan, receiver, id, args, argumentSpan) :
        new MethodCall(span, sourceSpan, nameSpan, receiver, id, args, argumentSpan);

    } else {
      if (isSafe) {
        if (this.consumeOptionalOperator('=')) {
          this.error('The \'?.\' operator cannot be used in the assignment');
          return new EmptyExpr(this.span(start), this.sourceSpan(start));
        } else {
          return new SafePropertyRead(
            this.span(start), this.sourceSpan(start), nameSpan, receiver, id);
        }
      } else {
        if (this.consumeOptionalOperator('=')) {
          if (!this.parseAction) {
            this.error('Bindings cannot contain assignments');
            return new EmptyExpr(this.span(start), this.sourceSpan(start));
          }

          const value = this.parseConditional();
          return new PropertyWrite(
            this.span(start), this.sourceSpan(start), nameSpan, receiver, id, value);
        } else {
          return new PropertyRead(this.span(start), this.sourceSpan(start), nameSpan, receiver, id);
        }
      }
    }
  }

  parseCallArguments(): BindingPipe[] {
    if (this.next.isCharacter(chars.$RPAREN)) return [];
    const positionals: AST[] = [];
    do {
      positionals.push(this.parsePipe());
    } while (this.consumeOptionalCharacter(chars.$COMMA));
    return positionals as BindingPipe[];
  }

  /**
   * Parses an identifier, a keyword, a string with an optional `-` in between,
   * and returns the string along with its absolute source span.
   */
  expectTemplateBindingKey(): TemplateBindingIdentifier {
    let result = '';
    let operatorFound = false;
    const start = this.currentAbsoluteOffset;
    do {
      result += this.expectIdentifierOrKeywordOrString();
      operatorFound = this.consumeOptionalOperator('-');
      if (operatorFound) {
        result += '-';
      }
    } while (operatorFound);
    return {
      source: result,
      span: new AbsoluteSourceSpan(start, start + result.length),
    };
  }

  /**
   * Parse microsyntax template expression and return a list of bindings or
   * parsing errors in case the given expression is invalid.
   *
   * For example,
   * ```
   *   <div *for="let item of items; index as i; trackBy: func">
   * ```
   * contains five bindings:
   * 1. for -> null
   * 2. item -> ForOfContext.$implicit
   * 3. forOf -> items
   * 4. i -> ForOfContext.index
   * 5. forTrackBy -> func
   *
   * For a full description of the microsyntax grammar, see
   * https://gist.github.com/mhevery/d3530294cff2e4a1b3fe15ff75d08855
   *
   * @param templateKey name of the microsyntax directive, like if, for,
   * without the *, along with its absolute span.
   */
  parseTemplateBindings(templateKey: TemplateBindingIdentifier): TemplateBindingParseResult {
    const bindings: TemplateBinding[] = [];

    // The first binding is for the template key itself
    // In *for="let item of items", key = "for", value = null
    // In *if="cond | pipe", key = "if", value = "cond | pipe"
    bindings.push(...this.parseDirectiveKeywordBindings(templateKey));

    while (this.index < this.tokens.length) {
      // If it starts with 'let', then this must be variable declaration
      const letBinding = this.parseLetBinding();
      if (letBinding) {
        bindings.push(letBinding);
      } else {
        // Two possible cases here, either `value "as" key` or
        // "directive-keyword expression". We don't know which case, but both
        // "value" and "directive-keyword" are template binding key, so consume
        // the key first.
        const key = this.expectTemplateBindingKey();
        // Peek at the next token, if it is "as" then this must be variable
        // declaration.
        const binding = this.parseAsBinding(key);
        if (binding) {
          bindings.push(binding);
        } else {
          // Otherwise the key must be a directive keyword, like "of". Transform
          // the key to actual key. Eg. of -> forOf, trackBy -> forTrackBy
          key.source =
            templateKey.source + key.source.charAt(0).toUpperCase() + key.source.substring(1);
          bindings.push(...this.parseDirectiveKeywordBindings(key));
        }
      }
      this.consumeStatementTerminator();
    }

    return new TemplateBindingParseResult(bindings, [] /* warnings */, this.errors);
  }

  parseKeyedReadOrWrite(receiver: AST, start: number, isSafe: boolean): AST {
    return this.withContext(ParseContextFlags.Writable, () => {
      this.rbracketsExpected++;
      const key = this.parsePipe();
      if (key instanceof EmptyExpr) {
        this.error(`Key access cannot be empty`);
      }
      this.rbracketsExpected--;
      this.expectCharacter(chars.$RBRACKET);
      if (this.consumeOptionalOperator('=')) {
        if (isSafe) {
          this.error('The \'?.\' operator cannot be used in the assignment');
        } else {
          const value = this.parseConditional();
          return new KeyedWrite(this.span(start), this.sourceSpan(start), receiver, key, value);
        }
      } else {
        return isSafe ? new SafeKeyedRead(this.span(start), this.sourceSpan(start), receiver, key) :
          new KeyedRead(this.span(start), this.sourceSpan(start), receiver, key);
      }

      return new EmptyExpr(this.span(start), this.sourceSpan(start));
    });
  }

  /**
   * Parse a directive keyword, followed by a mandatory expression.
   * For example, "of items", "trackBy: func".
   * The bindings are: forOf -> items, forTrackBy -> func
   * There could be an optional "as" binding that follows the expression.
   * For example,
   * ```
   *   *for="let item of items | slice:0:1 as collection".
   *                    ^^ ^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^
   *               keyword    bound target   optional 'as' binding
   * ```
   *
   * @param key binding key, for example, for, if, forOf, along with its
   * absolute span.
   */
  private parseDirectiveKeywordBindings(key: TemplateBindingIdentifier): TemplateBinding[] {
    const bindings: TemplateBinding[] = [];
    this.consumeOptionalCharacter(chars.$COLON);  // trackBy: trackByFunction
    const value = this.getDirectiveBoundTarget();
    let spanEnd = this.currentAbsoluteOffset;
    // The binding could optionally be followed by "as". For example,
    // *if="cond | pipe as x". In this case, the key in the "as" binding
    // is "x" and the value is the template key itself ("if"). Note that the
    // 'key' in the current context now becomes the "value" in the next binding.
    const asBinding = this.parseAsBinding(key);
    if (!asBinding) {
      this.consumeStatementTerminator();
      spanEnd = this.currentAbsoluteOffset;
    }
    const sourceSpan = new AbsoluteSourceSpan(key.span.start, spanEnd);
    bindings.push(new ExpressionBinding(sourceSpan, key, value));
    if (asBinding) {
      bindings.push(asBinding);
    }
    return bindings;
  }

  /**
   * Return the expression AST for the bound target of a directive keyword
   * binding. For example,
   * ```
   *   *if="condition | pipe"
   *          ^^^^^^^^^^^^^^^^ bound target for "if"
   *   *for="let item of items"
   *                       ^^^^^ bound target for "forOf"
   * ```
   */
  private getDirectiveBoundTarget(): ASTWithSource | null {
    if (this.next === EOF || this.peekKeywordAs() || this.peekKeywordLet()) {
      return null;
    }
    const ast = this.parsePipe();  // example: "condition | async"
    const { start, end } = ast.span;
    const value = this.input.substring(start, end);
    return new ASTWithSource(ast, value, this.location, this.absoluteOffset + start, this.errors);
  }

  /**
   * Return the binding for a variable declared using `as`. Note that the order
   * of the key-value pair in this declaration is reversed. For example,
   * ```
   *   *for="let item of items; index as i"
   *                              ^^^^^    ^
   *                              value    key
   * ```
   *
   * @param value name of the value in the declaration, "if" in the example
   * above, along with its absolute span.
   */
  private parseAsBinding(value: TemplateBindingIdentifier): TemplateBinding | null {
    if (!this.peekKeywordAs()) {
      return null;
    }
    this.advance();  // consume the 'as' keyword
    const key = this.expectTemplateBindingKey();
    this.consumeStatementTerminator();
    const sourceSpan = new AbsoluteSourceSpan(value.span.start, this.currentAbsoluteOffset);
    return new VariableBinding(sourceSpan, key, value);
  }

  /**
   * Return the binding for a variable declared using `let`. For example,
   * ```
   *   *for="let item of items; let i=index;"
   *           ^^^^^^^^           ^^^^^^^^^^^
   * ```
   * In the first binding, `item` is bound to `ForOfContext.$implicit`.
   * In the second binding, `i` is bound to `ForOfContext.index`.
   */
  private parseLetBinding(): TemplateBinding | null {
    if (!this.peekKeywordLet()) {
      return null;
    }
    const spanStart = this.currentAbsoluteOffset;
    this.advance();  // consume the 'let' keyword
    const key = this.expectTemplateBindingKey();
    let value: TemplateBindingIdentifier | null = null;
    if (this.consumeOptionalOperator('=')) {
      value = this.expectTemplateBindingKey();
    }
    this.consumeStatementTerminator();
    const sourceSpan = new AbsoluteSourceSpan(spanStart, this.currentAbsoluteOffset);
    return new VariableBinding(sourceSpan, key, value);
  }

  /**
   * Consume the optional statement terminator: semicolon or comma.
   */
  private consumeStatementTerminator() {
    this.consumeOptionalCharacter(chars.$SEMICOLON) || this.consumeOptionalCharacter(chars.$COMMA);
  }

  /**
   * Records an error and skips over the token stream until reaching a recoverable point. See
   * `this.skip` for more details on token skipping.
   */
  error(message: string, index: number | null = null) {
    this.errors.push(new ParserError(message, this.input, this.locationText(index), this.location));
    this.skip();
  }

  private locationText(index: number | null = null) {
    if (index == null) index = this.index;
    return (index < this.tokens.length) ? `at column ${this.tokens[index].index + 1} in` :
      `at the end of the expression`;
  }

  /**
   * Records an error for an unexpected private identifier being discovered.
   * @param token Token representing a private identifier.
   * @param extraMessage Optional additional message being appended to the error.
   */
  private _reportErrorForPrivateIdentifier(token: Token, extraMessage: string | null) {
    let errorMessage =
      `Private identifiers are not supported. Unexpected private identifier: ${token}`;
    if (extraMessage !== null) {
      errorMessage += `, ${extraMessage}`;
    }
    this.error(errorMessage);
  }

  /**
   * Error recovery should skip tokens until it encounters a recovery point.
   *
   * The following are treated as unconditional recovery points:
   *   - end of input
   *   - ';' (parseChain() is always the root production, and it expects a ';')
   *   - '|' (since pipes may be chained and each pipe expression may be treated independently)
   *
   * The following are conditional recovery points:
   *   - ')', '}', ']' if one of calling productions is expecting one of these symbols
   *     - This allows skip() to recover from errors such as '(a.) + 1' allowing more of the AST to
   *       be retained (it doesn't skip any tokens as the ')' is retained because of the '(' begins
   *       an '(' <expr> ')' production).
   *       The recovery points of grouping symbols must be conditional as they must be skipped if
   *       none of the calling productions are not expecting the closing token else we will never
   *       make progress in the case of an extraneous group closing symbol (such as a stray ')').
   *       That is, we skip a closing symbol if we are not in a grouping production.
   *   - '=' in a `Writable` context
   *     - In this context, we are able to recover after seeing the `=` operator, which
   *       signals the presence of an independent rvalue expression following the `=` operator.
   *
   * If a production expects one of these token it increments the corresponding nesting count,
   * and then decrements it just prior to checking if the token is in the input.
   */
  private skip() {
    let n = this.next;
    while (this.index < this.tokens.length && !n.isCharacter(chars.$SEMICOLON) &&
      !n.isOperator('|') && (this.rparensExpected <= 0 || !n.isCharacter(chars.$RPAREN)) &&
      (this.rbracesExpected <= 0 || !n.isCharacter(chars.$RBRACE)) &&
      (this.rbracketsExpected <= 0 || !n.isCharacter(chars.$RBRACKET)) &&
      (!(this.context & ParseContextFlags.Writable) || !n.isOperator('='))) {
      if (this.next.isError()) {
        this.errors.push(
          new ParserError(this.next.toString()!, this.input, this.locationText(), this.location));
      }
      this.advance();
      n = this.next;
    }
  }
}

class SimpleExpressionChecker implements AstVisitor {
  errors: string[] = [];

  visitImplicitReceiver(ast: ImplicitReceiver, context: any) { }

  visitThisReceiver(ast: ThisReceiver, context: any) { }

  visitInterpolation(ast: Interpolation, context: any) { }

  visitLiteralPrimitive(ast: LiteralPrimitive, context: any) { }

  visitPropertyRead(ast: PropertyRead, context: any) { }

  visitPropertyWrite(ast: PropertyWrite, context: any) { }

  visitSafePropertyRead(ast: SafePropertyRead, context: any) { }

  visitMethodCall(ast: MethodCall, context: any) { }

  visitSafeMethodCall(ast: SafeMethodCall, context: any) { }

  visitFunctionCall(ast: FunctionCall, context: any) { }

  visitLiteralArray(ast: LiteralArray, context: any) {
    this.visitAll(ast.expressions, context);
  }

  visitLiteralMap(ast: LiteralMap, context: any) {
    this.visitAll(ast.values, context);
  }

  visitUnary(ast: Unary, context: any) { }

  visitBinary(ast: Binary, context: any) { }

  visitPrefixNot(ast: PrefixNot, context: any) { }

  visitNonNullAssert(ast: NonNullAssert, context: any) { }

  visitConditional(ast: Conditional, context: any) { }

  visitPipe(ast: BindingPipe, context: any) {
    this.errors.push('pipes');
  }

  visitKeyedRead(ast: KeyedRead, context: any) { }

  visitKeyedWrite(ast: KeyedWrite, context: any) { }

  visitAll(asts: any[], context: any): any[] {
    return asts.map(node => node.visit(this, context));
  }

  visitChain(ast: Chain, context: any) { }

  visitQuote(ast: Quote, context: any) { }

  visitSafeKeyedRead(ast: SafeKeyedRead, context: any) { }
}

/**
 * This class implements SimpleExpressionChecker used in View Engine and performs more strict checks
 * to make sure host bindings do not contain pipes. In View Engine, having pipes in host bindings is
 * not supported as well, but in some cases (like `!(value | async)`) the error is not triggered at
 * compile time. In order to preserve View Engine behavior, more strict checks are introduced for
 * Ivy mode only.
 */
class IvySimpleExpressionChecker extends RecursiveAstVisitor implements SimpleExpressionChecker {
  errors: string[] = [];

  override visitPipe() {
    this.errors.push('pipes');
  }
}
