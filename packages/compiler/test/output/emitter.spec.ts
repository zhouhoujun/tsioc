/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import expect = require('expect');
import { EmitterVisitorContext, escapeIdentifier } from '../../src/output/emitter';
import { SourceMap } from '../../src/output/source_map';
import { ParseLocation, ParseSourceFile, ParseSourceSpan } from '../../src/util';
import { originalPositionFor } from '../utils';



{
    describe('AbstractEmitter', () => {
        describe('escapeIdentifier', () => {
            it('should escape single quotes', () => {
                expect(escapeIdentifier(`'`, false)).toEqual(`'\\''`);
            });

            it('should escape backslash', () => {
                expect(escapeIdentifier('\\', false)).toEqual(`'\\\\'`);
            });

            it('should escape newlines', () => {
                expect(escapeIdentifier('\n', false)).toEqual(`'\\n'`);
            });

            it('should escape carriage returns', () => {
                expect(escapeIdentifier('\r', false)).toEqual(`'\\r'`);
            });

            it('should escape $', () => {
                expect(escapeIdentifier('$', true)).toEqual(`'\\$'`);
            });
            it('should not escape $', () => {
                expect(escapeIdentifier('$', false)).toEqual(`'$'`);
            });
            it('should add quotes for non-identifiers', () => {
                expect(escapeIdentifier('==', false, false)).toEqual(`'=='`);
            });
            it('does not escape class (but it probably should)', () => {
                expect(escapeIdentifier('class', false, false)).toEqual('class');
            });
        });
    });
}

export function stripSourceMapAndNewLine(source: string): string {
    if (source.endsWith('\n')) {
        source = source.substring(0, source.length - 1);
    }
    const smi = source.lastIndexOf('\n//#');
    if (smi == -1) return source;
    return source.slice(0, smi);
}


describe('AbstractEmitter', () => {
    describe('EmitterVisitorContext', () => {
        const fileA = new ParseSourceFile('a0a1a2a3a4a5a6a7a8a9', 'a.js');
        const fileB = new ParseSourceFile('b0b1b2b3b4b5b6b7b8b9', 'b.js');
        let ctx: EmitterVisitorContext;

        beforeEach(() => {
            ctx = EmitterVisitorContext.createRoot();
        });

        it('should add source files to the source map', () => {
            ctx.print(createSourceSpan(fileA, 0), 'o0');
            ctx.print(createSourceSpan(fileA, 1), 'o1');
            ctx.print(createSourceSpan(fileB, 0), 'o2');
            ctx.print(createSourceSpan(fileB, 1), 'o3');
            const sm = ctx.toSourceMapGenerator('o.ts').toJSON()!;
            expect(sm.sources).toEqual([fileA.url, fileB.url]);
            expect(sm.sourcesContent).toEqual([fileA.content, fileB.content]);
        });

        it('should generate a valid mapping', () => {
            ctx.print(createSourceSpan(fileA, 0), 'fileA-0');
            ctx.println(createSourceSpan(fileB, 1), 'fileB-1');
            ctx.print(createSourceSpan(fileA, 2), 'fileA-2');

            expectMap(ctx, 0, 0, 'a.js', 0, 0);
            expectMap(ctx, 0, 7, 'b.js', 0, 2);
            expectMap(ctx, 1, 0, 'a.js', 0, 4);
        });

        it('should be able to shift the content', () => {
            ctx.print(createSourceSpan(fileA, 0), 'fileA-0');

            const sm = ctx.toSourceMapGenerator('o.ts', 10).toJSON()!;
            expect(originalPositionFor(sm, { line: 11, column: 0 })).toEqual({
                line: 1,
                column: 0,
                source: 'a.js',
            });
        });

        it('should use the default source file for the first character', () => {
            ctx.print(null, 'fileA-0');
            expectMap(ctx, 0, 0, 'o.ts', 0, 0);
        });

        it('should use an explicit mapping for the first character', () => {
            ctx.print(createSourceSpan(fileA, 0), 'fileA-0');
            expectMap(ctx, 0, 0, 'a.js', 0, 0);
        });

        it('should map leading segment without span', () => {
            ctx.print(null, '....');
            ctx.print(createSourceSpan(fileA, 0), 'fileA-0');

            expectMap(ctx, 0, 0, 'o.ts', 0, 0);
            expectMap(ctx, 0, 4, 'a.js', 0, 0);
            expect(nbSegmentsPerLine(ctx)).toEqual([2]);
        });

        it('should handle indent', () => {
            ctx.incIndent();
            ctx.println(createSourceSpan(fileA, 0), 'fileA-0');
            ctx.incIndent();
            ctx.println(createSourceSpan(fileA, 1), 'fileA-1');
            ctx.decIndent();
            ctx.println(createSourceSpan(fileA, 2), 'fileA-2');

            expectMap(ctx, 0, 0, 'o.ts', 0, 0);
            expectMap(ctx, 0, 2, 'a.js', 0, 0);
            expectMap(ctx, 1, 0);
            expectMap(ctx, 1, 2);
            expectMap(ctx, 1, 4, 'a.js', 0, 2);
            expectMap(ctx, 2, 0);
            expectMap(ctx, 2, 2, 'a.js', 0, 4);

            expect(nbSegmentsPerLine(ctx)).toEqual([2, 1, 1]);
        });

        it('should coalesce identical span', () => {
            const span = createSourceSpan(fileA, 0);
            ctx.print(span, 'fileA-0');
            ctx.print(null, '...');
            ctx.print(span, 'fileA-0');
            ctx.print(createSourceSpan(fileB, 0), 'fileB-0');

            expectMap(ctx, 0, 0, 'a.js', 0, 0);
            expectMap(ctx, 0, 7, 'a.js', 0, 0);
            expectMap(ctx, 0, 10, 'a.js', 0, 0);
            expectMap(ctx, 0, 17, 'b.js', 0, 0);

            expect(nbSegmentsPerLine(ctx)).toEqual([2]);
        });
    });
});



// All lines / columns indexes are 0-based
// Note: source-map line indexes are 1-based, column 0-based
function expectMap(
    ctx: EmitterVisitorContext, genLine: number, genCol: number, source: string | null = null,
    srcLine: number | null = null, srcCol: number | null = null) {
    const sm = ctx.toSourceMapGenerator('o.ts').toJSON()!;
    const genPosition = { line: genLine + 1, column: genCol };
    const origPosition = originalPositionFor(sm, genPosition);
    // TODO: Review use of `any` here (#19904)
    expect(origPosition.source as any).toEqual(source);
    expect(origPosition.line as any).toEqual(srcLine === null ? null : srcLine + 1);
    expect(origPosition.column as any).toEqual(srcCol);
}

// returns the number of segments per line
function nbSegmentsPerLine(ctx: EmitterVisitorContext) {
    const sm = ctx.toSourceMapGenerator('o.ts').toJSON()!;
    const lines = sm.mappings.split(';');
    return lines.map(l => {
        const m = l.match(/,/g);
        return m === null ? 1 : m.length + 1;
    });
}

function createSourceSpan(file: ParseSourceFile, idx: number) {
    const col = 2 * idx;
    const start = new ParseLocation(file, col, 0, col);
    const end = new ParseLocation(file, col + 2, 0, col + 2);
    const sourceSpan = new ParseSourceSpan(start, end);
    return { sourceSpan };
}

