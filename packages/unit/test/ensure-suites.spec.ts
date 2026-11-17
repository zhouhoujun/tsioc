import { ensureSuitesFound } from '../src/runner/ensure-suites';
import expect = require('expect');

class FakeSuite { }

describe('ensureSuitesFound', () => {

    it('throws when a glob matches nothing', () => {
        expect(() => ensureSuitesFound('./test/**/*.spec.ts', 0, { baseURL: '/tmp/project' }))
            .toThrow(/No test files matched/);
    });

    it('mentions every pattern and the baseURL', () => {
        let message = '';
        try {
            ensureSuitesFound(['./a/**/*.ts', './b/**/*.ts'], 0, { baseURL: '/tmp/project' });
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).toContain('"./a/**/*.ts"');
        expect(message).toContain('"./b/**/*.ts"');
        expect(message).toContain('/tmp/project');
        expect(message).toContain('allowEmpty');
    });

    it('accepts a glob that matched suites', () => {
        expect(() => ensureSuitesFound('./test/*.ts', 1)).not.toThrow();
    });

    it('accepts BDD suites registered while loading', () => {
        expect(() => ensureSuitesFound('./test/*.ts', 3)).not.toThrow();
    });

    it('throws when nothing was registered at all', () => {
        expect(() => ensureSuitesFound('./test/*.ts', 0)).toThrow(/No test files matched/);
    });

    it('honours an explicit allowEmpty', () => {
        expect(() => ensureSuitesFound('./test/**/*.ts', 0, { allowEmpty: true })).not.toThrow();
    });

    it('does not guard type-based suites', () => {
        expect(() => ensureSuitesFound(FakeSuite, 0)).not.toThrow();
    });

    it('does not guard mixed type suites', () => {
        expect(() => ensureSuitesFound([FakeSuite], 0)).not.toThrow();
    });

});
