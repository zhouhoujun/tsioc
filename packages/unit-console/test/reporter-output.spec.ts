import { ConsoleReporter } from '../src';
import expect = require('expect');

function reporter(): ConsoleReporter {
    const instance = new ConsoleReporter();
    (instance as any).hrtime = { format: () => '1.00ms' };
    return instance;
}

function suite(describe: string, cases: Array<{ title: string; error?: Error }>): any {
    return { describe, cases, timeout: 1000 };
}

describe('ConsoleReporter output', () => {

    it('renders the passing summary', async () => {
        const lines: string[] = [];
        const log = console.log;
        console.log = (...args: any[]) => { lines.push(args.join(' ')); };
        try {
            await reporter().render([
                suite('suite a', [{ title: 'case 1' }, { title: 'case 2' }])
            ] as any, [0, 1000000]);
        } finally {
            console.log = log;
        }
        const output = lines.join('\n');
        expect(output).toContain('2 passing');
        expect(output).not.toContain('failed');
    });

    it('renders failures and exits with a non-zero code', async () => {
        const lines: string[] = [];
        const log = console.log;
        const exit = process.exit;
        let exitCode: number | undefined;
        console.log = (...args: any[]) => { lines.push(args.join(' ')); };
        (process as any).exit = (code?: number) => { exitCode = code; };
        try {
            await reporter().render([
                suite('suite a', [
                    { title: 'ok case' },
                    { title: 'bad case', error: new Error('boom') }
                ])
            ] as any, [0, 1000000]);
        } finally {
            console.log = log;
            (process as any).exit = exit;
        }
        const output = lines.join('\n');
        expect(output).toContain('1 passing');
        expect(output).toContain('1 failed');
        expect(output).toContain('boom');
        expect(exitCode).toBe(1);
    });

    it('prints a check mark per passing case and a cross per failing case', () => {
        const lines: string[] = [];
        const log = console.log;
        console.log = (...args: any[]) => { lines.push(args.join(' ')); };
        try {
            const instance = reporter();
            instance.renderCase({ title: 'passing case' } as any);
            instance.renderCase({ title: 'failing case', error: new Error('x') } as any);
        } finally {
            console.log = log;
        }
        expect(lines[0]).toContain('√');
        expect(lines[0]).toContain('passing case');
        expect(lines[0]).toContain('1.00ms');
        expect(lines[1]).toContain('x');
        expect(lines[1]).toContain('failing case');
    });

    it('prints the suite name', () => {
        const lines: string[] = [];
        const log = console.log;
        console.log = (...args: any[]) => { lines.push(args.join(' ')); };
        try {
            reporter().renderSuite({ describe: 'my suite' } as any);
        } finally {
            console.log = log;
        }
        expect(lines.join('\n')).toContain('my suite');
    });

    it('rethrows tracked errors', () => {
        expect(() => reporter().track(new Error('tracked'))).toThrow('tracked');
    });

});
