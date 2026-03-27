import expect = require('expect');
import { STRIP_COMMENTS, ARGUMENT_NAMES } from '../src/utils/exps';

describe('Utils Expressions', () => {

    describe('STRIP_COMMENTS', () => {
        it('should match single line comments', () => {
            const code = '// this is a comment\ncode';
            const result = code.replace(STRIP_COMMENTS, '');
            expect(result.trim()).toBe('code');
        });

        it('should match multi-line comments', () => {
            const code = '/* comment */code';
            const result = code.replace(STRIP_COMMENTS, '');
            expect(result).toBe('code');
        });

        it('should match multiple comments', () => {
            const code = '// line1\n/* block */code// line2';
            const result = code.replace(STRIP_COMMENTS, '');
            expect(result.trim()).toBe('code');
        });

        it('should not affect code without comments', () => {
            const code = 'function test() { return 1; }';
            const result = code.replace(STRIP_COMMENTS, '');
            expect(result).toBe(code);
        });
    });

    describe('ARGUMENT_NAMES', () => {
        it('should match argument names', () => {
            const args = 'a, b, c'.match(ARGUMENT_NAMES);
            expect(args).toBeTruthy();
            expect(args!.length).toBeGreaterThan(0);
        });

        it('should match single argument', () => {
            const args = 'param'.match(ARGUMENT_NAMES);
            expect(args).toBeTruthy();
        });

        it('should handle whitespace', () => {
            const args = '  a  ,  b  '.match(ARGUMENT_NAMES);
            expect(args).toBeTruthy();
        });
    });
});