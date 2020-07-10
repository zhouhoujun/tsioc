import { Parser, SplitInterpolation } from '../../src/expression_parser/parser';
import { BindingPipe, TemplateBinding, Interpolation, ASTWithSource, ParserError, VariableBinding } from '../../src/expression_parser/ast';
import { Lexer } from '../../src/expression_parser/lexer';
import { unparse, validate } from './utils';
import expect = require('expect');

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


describe('parser', () => {
    describe('parseAction', () => {
        it('should parse numbers', () => { checkAction('1'); });

        it('should parse strings', () => {
            checkAction('\'1\'', '"1"');
            checkAction('"1"');
        });

        it('should parse null', () => { checkAction('null'); });

        it('should parse undefined', () => { checkAction('undefined'); });

        it('should parse unary - expressions', () => {
            checkAction('-1', '0 - 1');
            checkAction('+1', '1 - 0');
            checkAction(`-'1'`, `0 - "1"`);
            checkAction(`+'1'`, `"1" - 0`);
        });

        it('should parse unary ! expressions', () => {
            checkAction('!true');
            checkAction('!!true');
            checkAction('!!!true');
        });

        it('should parse postfix ! expression', () => {
            checkAction('true!');
            checkAction('a!.b');
            checkAction('a!!!!.b');
        });

        it('should parse multiplicative expressions',
            () => { checkAction('3*4/2%5', '3 * 4 / 2 % 5'); });

        it('should parse additive expressions', () => { checkAction('3 + 6 - 2'); });

        it('should parse relational expressions', () => {
            checkAction('2 < 3');
            checkAction('2 > 3');
            checkAction('2 <= 2');
            checkAction('2 >= 2');
        });

        it('should parse equality expressions', () => {
            checkAction('2 == 3');
            checkAction('2 != 3');
        });

        it('should parse strict equality expressions', () => {
            checkAction('2 === 3');
            checkAction('2 !== 3');
        });

        it('should parse expressions', () => {
            checkAction('true && true');
            checkAction('true || false');
        });

        it('should parse grouped expressions', () => { checkAction('(1 + 2) * 3', '1 + 2 * 3'); });

        it('should ignore comments in expressions', () => { checkAction('a //comment', 'a'); });

        it('should retain // in string literals',
            () => { checkAction(`"http://www.google.com"`, `"http://www.google.com"`); });

        it('should parse an empty string', () => { checkAction(''); });

        describe('literals', () => {
            it('should parse array', () => {
                checkAction('[1][0]');
                checkAction('[[1]][0][0]');
                checkAction('[]');
                checkAction('[].length');
                checkAction('[1, 2].length');
            });

            it('should parse map', () => {
                checkAction('{}');
                checkAction('{a: 1, "b": 2}[2]');
                checkAction('{}["a"]');
            });

            it('should only allow identifier, string, or keyword as map key', () => {
                expectActionError('{(:0}', 'expected identifier, keyword, or string');
                expectActionError('{1234:0}', 'expected identifier, keyword, or string');
            });
        });

        describe('member access', () => {
            it('should parse field access', () => {
                checkAction('a');
                checkAction('this.a', 'a');
                checkAction('a.a');
            });

            it('should only allow identifier or keyword as member names', () => {
                expectActionError('x.(', 'identifier or keyword');
                expectActionError('x. 1234', 'identifier or keyword');
                expectActionError('x."foo"', 'identifier or keyword');
            });

            it('should parse safe field access', () => {
                checkAction('a?.a');
                checkAction('a.a?.a');
            });
        });

        describe('method calls', () => {
            it('should parse method calls', () => {
                checkAction('fn()');
                checkAction('add(1, 2)');
                checkAction('a.add(1, 2)');
                checkAction('fn().add(1, 2)');
            });
        });

        describe('functional calls', () => {
            it('should parse function calls', () => { checkAction('fn()(1, 2)'); });
        });

        describe('conditional', () => {
            it('should parse ternary/conditional expressions', () => {
                checkAction('7 == 3 + 4 ? 10 : 20');
                checkAction('false ? 10 : 20');
            });

            it('should report incorrect ternary operator syntax', () => {
                expectActionError('true?1', 'Conditional expression true?1 requires all 3 expressions');
            });
        });

        describe('assignment', () => {
            it('should support field assignments', () => {
                checkAction('a = 12');
                checkAction('a.a.a = 123');
                checkAction('a = 123; b = 234;');
            });

            it('should report on safe field assignments',
                () => { expectActionError('a?.a = 123', 'cannot be used in the assignment'); });

            it('should support array updates', () => { checkAction('a[0] = 200'); });
        });

        it('should error when using pipes',
            () => { expectActionError('x|blah', 'Cannot have a pipe'); });

        it('should store the source in the result',
            () => { expect(parseAction('someExpr', 'someExpr')); });

        it('should store the passed-in location',
            () => { expect(parseAction('someExpr', 'location').location).toBe('location'); });

        it('should report when encountering interpolation', () => {
            expectActionError('{{a()}}', 'Got interpolation ({{}}) where expression was expected');
        });
    });

    describe('general error handling', () => {
        it('should report an unexpected token',
            () => { expectActionError('[1,2] trac', 'Unexpected token \'trac\''); });

        it('should report reasonable error for unconsumed tokens',
            () => { expectActionError(')', 'Unexpected token ) at column 1 in [)]'); });

        it('should report a missing expected token', () => {
            expectActionError('a(b', 'Missing expected ) at the end of the expression [a(b]');
        });
    });

    describe('parseBinding', () => {
        describe('pipes', () => {
            it('should parse pipes', () => {
                checkBinding('a(b | c)', 'a((b | c))');
                checkBinding('a.b(c.d(e) | f)', 'a.b((c.d(e) | f))');
                checkBinding('[1, 2, 3] | a', '([1, 2, 3] | a)');
                checkBinding('{a: 1, "b": 2} | c', '({a: 1, "b": 2} | c)');
                checkBinding('a[b] | c', '(a[b] | c)');
                checkBinding('a?.b | c', '(a?.b | c)');
                checkBinding('true | a', '(true | a)');
                checkBinding('a | b:c | d', '((a | b:c) | d)');
                checkBinding('a | b:(c | d)', '(a | b:(c | d))');
            });

            it('should only allow identifier or keyword as formatter names', () => {
                expectBindingError('"Foo"|(', 'identifier or keyword');
                expectBindingError('"Foo"|1234', 'identifier or keyword');
                expectBindingError('"Foo"|"uppercase"', 'identifier or keyword');
            });

            it('should parse quoted expressions', () => { checkBinding('a:b', 'a:b'); });

            it('should not crash when prefix part is not tokenizable',
                () => { checkBinding('"a:b"', '"a:b"'); });

            it('should ignore whitespace around quote prefix', () => { checkBinding(' a :b', 'a:b'); });

            it('should refuse prefixes that are not single identifiers', () => {
                expectBindingError('a + b:c', '');
                expectBindingError('1:c', '');
            });
        });

        it('should store the source in the result',
            () => { expect(parseBinding('someExpr').source).toBe('someExpr'); });

        it('should store the passed-in location',
            () => { expect(parseBinding('someExpr', 'location').location).toBe('location'); });

        it('should report chain expressions',
            () => { expectError(parseBinding('1;2'), 'contain chained expression'); });

        it('should report assignment',
            () => { expectError(parseBinding('a=2'), 'contain assignments'); });

        it('should report when encountering interpolation', () => {
            expectBindingError('{{a.b}}', 'Got interpolation ({{}}) where expression was expected');
        });

        it('should parse conditional expression', () => { checkBinding('a < b ? a : b'); });

        it('should ignore comments in bindings', () => { checkBinding('a //comment', 'a'); });

        it('should retain // in string literals',
            () => { checkBinding(`"http://www.google.com"`, `"http://www.google.com"`); });

        it('should retain // in : microsyntax', () => { checkBinding('one:a//b', 'one:a//b'); });

    });

    describe('parseTemplateBindings', () => {
        function humanize(bindings: TemplateBinding[]): Array<[string, string | null, boolean]> {
            return bindings.map(binding => {
                const key = binding.key.source;
                const value = binding.value ? binding.value.source : null;
                const keyIsVar = binding instanceof VariableBinding;
                return [key, value, keyIsVar];
            });
        }

        function humanizeSpans(
            bindings: TemplateBinding[], attr: string): Array<[string, string, string | null]> {
            return bindings.map(binding => {
                const { sourceSpan, key, value } = binding;
                const sourceStr = attr.substring(sourceSpan.start, sourceSpan.end);
                const keyStr = attr.substring(key.span.start, key.span.end);
                let valueStr = null;
                if (value) {
                    const { start, end } = value instanceof ASTWithSource ? value.ast.sourceSpan : value.span;
                    valueStr = attr.substring(start, end);
                }
                return [sourceStr, keyStr, valueStr];
            });
        }

        it('should parse key and value', () => {
            const cases: Array<[string, string, string | null, boolean, string, string, string | null]> =
                [
                    // expression, key, value, VariableBinding, source span, key span, value span
                    ['*a=""', 'a', null, false, 'a="', 'a', null],
                    ['*a="b"', 'a', 'b', false, 'a="b', 'a', 'b'],
                    ['*a-b="c"', 'a-b', 'c', false, 'a-b="c', 'a-b', 'c'],
                    ['*a="1+1"', 'a', '1+1', false, 'a="1+1', 'a', '1+1'],
                ];
            for (const [attr, key, value, keyIsVar, sourceSpan, keySpan, valueSpan] of cases) {
                const bindings = parseTemplateBindings(attr);
                expect(humanize(bindings)).toEqual([
                    [key, value, keyIsVar],
                ]);
                expect(humanizeSpans(bindings, attr)).toEqual([
                    [sourceSpan, keySpan, valueSpan],
                ]);
            }
        });

        it('should variable declared via let', () => {
            const bindings = parseTemplateBindings('*a="let b"');
            expect(humanize(bindings)).toEqual([
                // key, value, VariableBinding
                ['a', null, false],
                ['b', null, true],
            ]);
        });

        it('should allow multiple pairs', () => {
            const bindings = parseTemplateBindings('*a="1 b 2"');
            expect(humanize(bindings)).toEqual([
                // key, value, VariableBinding
                ['a', '1', false],
                ['aB', '2', false],
            ]);
        });

        it('should allow space and colon as separators', () => {
            const bindings = parseTemplateBindings('*a="1,b 2"');
            expect(humanize(bindings)).toEqual([
                // key, value, VariableBinding
                ['a', '1', false],
                ['aB', '2', false],
            ]);
        });

        it('should store the templateUrl', () => {
            const bindings = parseTemplateBindings('*a="1,b 2"', '/foo/bar.html');
            expect(humanize(bindings)).toEqual([
                // key, value, VariableBinding
                ['a', '1', false],
                ['aB', '2', false],
            ]);
            expect((bindings[0].value as ASTWithSource).location).toEqual('/foo/bar.html');
        });

        it('should support common usage of ngIf', () => {
            const bindings = parseTemplateBindings('*ngIf="cond | pipe as foo, let x; ngIf as y"');
            expect(humanize(bindings)).toEqual([
                // [ key, value, VariableBinding ]
                ['ngIf', 'cond | pipe', false],
                ['foo', 'ngIf', true],
                ['x', null, true],
                ['y', 'ngIf', true],
            ]);
        });

        it('should support common usage of ngFor', () => {
            let bindings: TemplateBinding[];
            bindings = parseTemplateBindings('*ngFor="let person of people"');
            expect(humanize(bindings)).toEqual([
                // [ key, value, VariableBinding ]
                ['ngFor', null, false],
                ['person', null, true],
                ['ngForOf', 'people', false],
            ]);


            bindings = parseTemplateBindings(
                '*ngFor="let item; of items | slice:0:1 as collection, trackBy: func; index as i"');
            expect(humanize(bindings)).toEqual([
                // [ key, value, VariableBinding ]
                ['ngFor', null, false],
                ['item', null, true],
                ['ngForOf', 'items | slice:0:1', false],
                ['collection', 'ngForOf', true],
                ['ngForTrackBy', 'func', false],
                ['i', 'index', true],
            ]);

            bindings = parseTemplateBindings(
                '*ngFor="let item, of: [1,2,3] | pipe as items; let i=index, count as len"');
            expect(humanize(bindings)).toEqual([
                // [ key, value, VariableBinding ]
                ['ngFor', null, false],
                ['item', null, true],
                ['ngForOf', '[1,2,3] | pipe', false],
                ['items', 'ngForOf', true],
                ['i', 'index', true],
                ['len', 'count', true],
            ]);
        });

        it('should parse pipes', () => {
            const bindings = parseTemplateBindings('*key="value|pipe "');
            expect(humanize(bindings)).toEqual([
                // [ key, value, VariableBinding ]
                ['key', 'value|pipe', false],
            ]);
            const { value } = bindings[0];
            expect(value).toBeInstanceOf(ASTWithSource);
            expect((value as ASTWithSource).ast).toBeInstanceOf(BindingPipe);
        });

        describe('"let" binding', () => {
            it('should support single declaration', () => {
                const bindings = parseTemplateBindings('*key="let i"');
                expect(humanize(bindings)).toEqual([
                    // [ key, value, VariableBinding ]
                    ['key', null, false],
                    ['i', null, true],
                ]);
            });

            it('should support multiple declarations', () => {
                const bindings = parseTemplateBindings('*key="let a; let b"');
                expect(humanize(bindings)).toEqual([
                    // [ key, value, VariableBinding ]
                    ['key', null, false],
                    ['a', null, true],
                    ['b', null, true],
                ]);
            });

            it('should support empty string assignment', () => {
                const bindings = parseTemplateBindings(`*key="let a=''; let b='';"`);
                expect(humanize(bindings)).toEqual([
                    // [ key, value, VariableBinding ]
                    ['key', null, false],
                    ['a', '', true],
                    ['b', '', true],
                ]);
            });

            it('should support key and value names with dash', () => {
                const bindings = parseTemplateBindings('*key="let i-a = j-a,"');
                expect(humanize(bindings)).toEqual([
                    // [ key, value, VariableBinding ]
                    ['key', null, false],
                    ['i-a', 'j-a', true],
                ]);
            });

            it('should support declarations with or without value assignment', () => {
                const bindings = parseTemplateBindings('*key="let item; let i = k"');
                expect(humanize(bindings)).toEqual([
                    // [ key, value, VariableBinding ]
                    ['key', null, false],
                    ['item', null, true],
                    ['i', 'k', true],
                ]);
            });

            it('should support declaration before an expression', () => {
                const bindings = parseTemplateBindings('*directive="let item in expr; let a = b"');
                expect(humanize(bindings)).toEqual([
                    // [ key, value, VariableBinding ]
                    ['directive', null, false],
                    ['item', null, true],
                    ['directiveIn', 'expr', false],
                    ['a', 'b', true],
                ]);
            });
        });

        describe('"as" binding', () => {
            it('should support single declaration', () => {
                const bindings = parseTemplateBindings('*ngIf="exp as local"');
                expect(humanize(bindings)).toEqual([
                    // [ key, value, VariableBinding ]
                    ['ngIf', 'exp', false],
                    ['local', 'ngIf', true],
                ]);
            });

            it('should support declaration after an expression', () => {
                const bindings = parseTemplateBindings('*ngFor="let item of items as iter; index as i"');
                expect(humanize(bindings)).toEqual([
                    // [ key, value, VariableBinding ]
                    ['ngFor', null, false],
                    ['item', null, true],
                    ['ngForOf', 'items', false],
                    ['iter', 'ngForOf', true],
                    ['i', 'index', true],
                ]);
            });

            it('should support key and value names with dash', () => {
                const bindings = parseTemplateBindings('*key="foo, k-b as l-b;"');
                expect(humanize(bindings)).toEqual([
                    // [ key, value, VariableBinding ]
                    ['key', 'foo', false],
                    ['l-b', 'k-b', true],
                ]);
            });
        });

        describe('source, key, value spans', () => {
            it('should map empty expression', () => {
                const attr = '*ngIf=""';
                const bindings = parseTemplateBindings(attr);
                expect(humanizeSpans(bindings, attr)).toEqual([
                    // source span, key span, value span
                    ['ngIf="', 'ngIf', null],
                ]);
            });

            it('should map variable declaration via "let"', () => {
                const attr = '*key="let i"';
                const bindings = parseTemplateBindings(attr);
                expect(humanizeSpans(bindings, attr)).toEqual([
                    // source span, key span, value span
                    ['key="', 'key', null],  // source span stretches till next binding
                    ['let i', 'i', null],
                ]);
            });

            it('shoud map multiple variable declarations via "let"', () => {
                const attr = '*key="let item; let i=index; let e=even;"';
                const bindings = parseTemplateBindings(attr);
                expect(humanizeSpans(bindings, attr)).toEqual([
                    // source span, key span, value span
                    ['key="', 'key', null],
                    ['let item; ', 'item', null],
                    ['let i=index; ', 'i', 'index'],
                    ['let e=even;', 'e', 'even'],
                ]);
            });

            it('shoud map expression with pipe', () => {
                const attr = '*ngIf="cond | pipe as foo, let x; ngIf as y"';
                const bindings = parseTemplateBindings(attr);
                expect(humanizeSpans(bindings, attr)).toEqual([
                    // source span, key span, value span
                    ['ngIf="cond | pipe ', 'ngIf', 'cond | pipe'],
                    ['ngIf="cond | pipe as foo, ', 'foo', 'ngIf'],
                    ['let x; ', 'x', null],
                    ['ngIf as y', 'y', 'ngIf'],
                ]);
            });

            it('should map variable declaration via "as"', () => {
                const attr =
                    '*ngFor="let item; of items | slice:0:1 as collection, trackBy: func; index as i"';
                const bindings = parseTemplateBindings(attr);
                expect(humanizeSpans(bindings, attr)).toEqual([
                    // source span, key span, value span
                    ['ngFor="', 'ngFor', null],
                    ['let item; ', 'item', null],
                    ['of items | slice:0:1 ', 'of', 'items | slice:0:1'],
                    ['of items | slice:0:1 as collection, ', 'collection', 'of'],
                    ['trackBy: func; ', 'trackBy', 'func'],
                    ['index as i', 'i', 'index'],
                ]);
            });

            it('should map literal array', () => {
                const attr = '*ngFor="let item, of: [1,2,3] | pipe as items; let i=index, count as len, "';
                const bindings = parseTemplateBindings(attr);
                expect(humanizeSpans(bindings, attr)).toEqual([
                    // source span, key span, value span
                    ['ngFor="', 'ngFor', null],
                    ['let item, ', 'item', null],
                    ['of: [1,2,3] | pipe ', 'of', '[1,2,3] | pipe'],
                    ['of: [1,2,3] | pipe as items; ', 'items', 'of'],
                    ['let i=index, ', 'i', 'index'],
                    ['count as len, ', 'len', 'count'],
                ]);
            });
        });
    });

    describe('parseInterpolation', () => {
        it('should return null if no interpolation',
            () => { expect(parseInterpolation('nothing')).toBe(null); });

        it('should parse no prefix/suffix interpolation', () => {
            const ast = parseInterpolation('{{a}}')!.ast as Interpolation;
            expect(ast.strings).toEqual(['', '']);
            expect(ast.expressions.length).toEqual(1);
            expect(ast.expressions[0].name).toEqual('a');
        });

        it('should parse prefix/suffix with multiple interpolation', () => {
            const originalExp = 'before {{ a }} middle {{ b }} after';
            const ast = parseInterpolation(originalExp)!.ast;
            expect(unparse(ast)).toEqual(originalExp);
            validate(ast);
        });

        it('should report empty interpolation expressions', () => {
            expectError(
                parseInterpolation('{{}}')!,
                'Blank expressions are not allowed in interpolated strings');

            expectError(
                parseInterpolation('foo {{  }}')!,
                'Parser Error: Blank expressions are not allowed in interpolated strings');
        });

        it('should parse conditional expression', () => { checkInterpolation('{{ a < b ? a : b }}'); });

        it('should parse expression with newline characters', () => {
            checkInterpolation(`{{ 'foo' +\n 'bar' +\r 'baz' }}`, `{{ "foo" + "bar" + "baz" }}`);
        });

        it('should support custom interpolation', () => {
            const parser = new Parser(new Lexer());
            const ast =
                parser.parseInterpolation('{% a %}', null, 0, { start: '{%', end: '%}' })!.ast as any;
            expect(ast.strings).toEqual(['', '']);
            expect(ast.expressions.length).toEqual(1);
            expect(ast.expressions[0].name).toEqual('a');
        });

        describe('comments', () => {
            it('should ignore comments in interpolation expressions',
                () => { checkInterpolation('{{a //comment}}', '{{ a }}'); });

            it('should retain // in single quote strings', () => {
                checkInterpolation(`{{ 'http://www.google.com' }}`, `{{ "http://www.google.com" }}`);
            });

            it('should retain // in double quote strings', () => {
                checkInterpolation(`{{ "http://www.google.com" }}`, `{{ "http://www.google.com" }}`);
            });

            it('should ignore comments after string literals',
                () => { checkInterpolation(`{{ "a//b" //comment }}`, `{{ "a//b" }}`); });

            it('should retain // in complex strings', () => {
                checkInterpolation(
                    `{{"//a\'//b\`//c\`//d\'//e" //comment}}`, `{{ "//a\'//b\`//c\`//d\'//e" }}`);
            });

            it('should retain // in nested, unterminated strings',
                () => { checkInterpolation(`{{ "a\'b\`" //comment}}`, `{{ "a\'b\`" }}`); });
        });

    });

    describe('parseSimpleBinding', () => {
        it('should parse a field access', () => {
            const p = parseSimpleBinding('name');
            expect(unparse(p)).toEqual('name');
            validate(p);
        });

        it('should report when encountering pipes', () => {
            expectError(
                validate(parseSimpleBinding('a | somePipe')),
                'Host binding expression cannot contain pipes');
        });

        it('should report when encountering interpolation', () => {
            expectError(
                validate(parseSimpleBinding('{{exp}}')),
                'Got interpolation ({{}}) where expression was expected');
        });

        it('should report when encountering field write', () => {
            expectError(validate(parseSimpleBinding('a = b')), 'Bindings cannot contain assignments');
        });
    });

    describe('wrapLiteralPrimitive', () => {
        it('should wrap a literal primitive', () => {
            expect(unparse(validate(createParser().wrapLiteralPrimitive('foo', null, 0))))
                .toEqual('"foo"');
        });
    });

    describe('error recovery', () => {
        function recover(text: string, expected?: string) {
            const expr = validate(parseAction(text));
            expect(unparse(expr)).toEqual(expected || text);
        }
        it('should be able to recover from an extra paren', () => recover('((a)))', 'a'));
        it('should be able to recover from an extra bracket', () => recover('[[a]]]', '[[a]]'));
        it('should be able to recover from a missing )', () => recover('(a;b', 'a; b;'));
        it('should be able to recover from a missing ]', () => recover('[a,b', '[a, b]'));
        it('should be able to recover from a missing selector', () => recover('a.'));
        it('should be able to recover from a missing selector in a array literal',
            () => recover('[[a.], b, c]'));
    });

    describe('offsets', () => {
        it('should retain the offsets of an interpolation', () => {
            const interpolations = splitInterpolation('{{a}}  {{b}}  {{c}}')!;
            expect(interpolations.offsets).toEqual([2, 9, 16]);
        });

        it('should retain the offsets into the expression AST of interpolations', () => {
            const source = parseInterpolation('{{a}}  {{b}}  {{c}}')!;
            const interpolation = source.ast as Interpolation;
            expect(interpolation.expressions.map(e => e.span.start)).toEqual([2, 9, 16]);
        });
    });
});

function createParser() {
    return new Parser(new Lexer());
}

function parseAction(text: string, location: any = null, offset = 0): ASTWithSource {
    return createParser().parseAction(text, location, offset);
}

function parseBinding(text: string, location: any = null, offset = 0): ASTWithSource {
    return createParser().parseBinding(text, location, offset);
}

function parseTemplateBindings(attribute: string, templateUrl = 'foo.html'): TemplateBinding[] {
    const match = attribute.match(/^\*(.+)="(.*)"$/);
    expect(match).toBeTruthy() ; // `failed to extract key and value from ${attribute}`);
    const [_, key, value] = match;
    const absKeyOffset = 1;  // skip the * prefix
    const absValueOffset = attribute.indexOf('=') + '="'.length;
    const parser = createParser();
    const result =
        parser.parseTemplateBindings(key, value, templateUrl, absKeyOffset, absValueOffset);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    return result.templateBindings;
}

function parseInterpolation(text: string, location: any = null, offset = 0): ASTWithSource |
    null {
    return createParser().parseInterpolation(text, location, offset);
}

function splitInterpolation(text: string, location: any = null): SplitInterpolation | null {
    return createParser().splitInterpolation(text, location);
}

function parseSimpleBinding(text: string, location: any = null, offset = 0): ASTWithSource {
    return createParser().parseSimpleBinding(text, location, offset);
}

function checkInterpolation(exp: string, expected?: string) {
    const ast = parseInterpolation(exp)!;
    if (expected == null) expected = exp;
    expect(unparse(ast)).toEqual(expected);
    validate(ast);
}

function checkBinding(exp: string, expected?: string) {
    const ast = parseBinding(exp);
    if (expected == null) expected = exp;
    expect(unparse(ast)).toEqual(expected);
    validate(ast);
}

function checkAction(exp: string, expected?: string) {
    const ast = parseAction(exp);
    if (expected == null) expected = exp;
    expect(unparse(ast)).toEqual(expected);
    validate(ast);
}

function expectError(ast: { errors: ParserError[] }, message: string) {
    for (const error of ast.errors) {
        if (error.message.indexOf(message) >= 0) {
            return;
        }
    }
    const errMsgs = ast.errors.map(err => err.message).join('\n');
    throw Error(
        `Expected an error containing "${message}" to be reported, but got the errors:\n` + errMsgs);
}

function expectActionError(text: string, message: string) {
    expectError(validate(parseAction(text)), message);
}

function expectBindingError(text: string, message: string) {
    expectError(validate(parseBinding(text)), message);
}
