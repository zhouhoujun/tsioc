import expect = require('expect');
import {
    analyzeFunctionCode,
    analyzeJsonCode,
    findFunctionSyntaxError,
    findJsonSyntaxError
} from '../web/code-editor';

/**
 * Function code is executed as an async function body, so the editor must
 * report syntax errors against that same grammar and map the position back to
 * the user's text.
 */
describe('Workflow function code editor', () => {
    it('accepts valid function code (return, await, top-level statements)', async () => {
        expect(await findFunctionSyntaxError('return input;')).toBeUndefined();
        expect(await findFunctionSyntaxError('const value = await context.actions.load();\nreturn { value };')).toBeUndefined();
        expect(await findFunctionSyntaxError('context.variables.count = (context.variables.count || 0) + 1;\nreturn input;')).toBeUndefined();
    });

    it('reports the first syntax error with its editor position', async () => {
        const error = await findFunctionSyntaxError('return (;');
        expect(error).toBeTruthy();
        expect(error!.message.toLowerCase()).toContain('unexpected');
        expect(error!.line).toBe(0);
        expect(error!.ch).toBeGreaterThan(0);
    });

    it('maps errors on later lines to the right line/column', async () => {
        const error = await findFunctionSyntaxError('const a = 1;\nconst b = ;\nreturn a;');
        expect(error).toBeTruthy();
        expect(error!.line).toBe(1);
        expect(error!.ch).toBeGreaterThan(0);
    });

    it('reports semantic issues without flagging workflow globals', async () => {
        const clean = await analyzeFunctionCode(
            'const value = context.variables.count || 0;\nconsole.log(input, msg);\nreturn { value };'
        );
        expect(clean).toEqual([]);

        const undefinedName = await analyzeFunctionCode('return missing.value;');
        expect(undefinedName.some(item => item.severity === 'warning' && item.message.includes('missing'))).toBe(true);

        const unused = await analyzeFunctionCode('const unused = 1;\nreturn input;');
        expect(unused.some(item => item.severity === 'warning' && item.message.includes('unused'))).toBe(true);

        const constant = await analyzeFunctionCode('const value = 1;\nvalue = 2;\nreturn value;');
        expect(constant.some(item => item.severity === 'error' && item.message.includes('value'))).toBe(true);

        const unreachable = await analyzeFunctionCode('return 1;\nconsole.log("never");');
        expect(unreachable.some(item => item.severity === 'warning' && item.message.includes('Unreachable'))).toBe(true);

        // A partial identifier at the cursor is a completion candidate, not a
        // typo yet; once it stops being a prefix, the warning returns.
        const partial = await analyzeFunctionCode('con', undefined, {
            cursorOffset: 3,
            knownNames: ['const', 'context']
        });
        expect(partial).toEqual([]);
        const typo = await analyzeFunctionCode('conatct', undefined, {
            cursorOffset: 7,
            knownNames: ['const', 'context']
        });
        expect(typo.some(item => item.message.includes('conatct'))).toBe(true);
    });

    it('warns about duplicate JSON object keys', async () => {
        expect(await analyzeJsonCode('{"a": 1, "b": 2}')).toEqual([]);
        const duplicates = await analyzeJsonCode('{"a": 1, "a": 2}');
        expect(duplicates.length).toBe(1);
        expect(duplicates[0].severity).toBe('warning');
        expect(duplicates[0].message).toContain('a');
        expect(duplicates[0].line).toBe(0);
    });

    it('validates JSON fields as JSON instead of async function code', async () => {
        expect(await findJsonSyntaxError('{"ok": true, "count": 2}')).toBeUndefined();
        expect(await findJsonSyntaxError('[1, 2, 3]')).toBeUndefined();
        expect(await findJsonSyntaxError('   ')).toBeUndefined();

        // A valid function body (`return 1;`) is not valid JSON.
        expect(await findJsonSyntaxError('return 1;')).toBeTruthy();
        const error = await findJsonSyntaxError('{\n  "a": 1,\n  "b": }\n}');
        expect(error).toBeTruthy();
        expect(error!.line).toBe(2);
        expect(error!.message).not.toContain('in JSON at position');
        expect(error!.message).not.toContain('is not valid JSON');
        expect(error!.message).not.toMatch(/\(line \d+ column \d+\)$/);
    });
});
