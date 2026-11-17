import { ServerApplicationArguments } from '../src/args';
import expect = require('expect');

function argsOf(source: string[], env: Record<string, string | undefined> = {}): ServerApplicationArguments {
    return new ServerApplicationArguments(env, source);
}

describe('ServerApplicationArguments', () => {

    it('parses flags and values', () => {
        const args = argsOf(['--name=app', '--port=8080', '--verbose', 'serve']);

        expect(args.args).toEqual({ name: 'app', port: 8080, verbose: true });
        expect(args.cmds).toEqual(['serve']);
    });

    it('parses decimal values', () => {
        const args = argsOf(['--ratio=0.5', '--port=8080']);

        expect(args.args.ratio).toBe(0.5);
        expect(args.args.port).toBe(8080);
    });

    it('keeps non numeric values as strings', () => {
        // `.5` and `1a2` are not numbers; the numeric check must not coerce them.
        const args = argsOf(['--half=.5', '--mixed=1a2']);

        expect(args.args.half).toBe('.5');
        expect(args.args.mixed).toBe('1a2');
    });

    it('resolves the mode from NODE_ENV, APP_MODE and --mode', () => {
        expect(argsOf([], { NODE_ENV: 'production' }).mode).toBe('production');
        expect(argsOf([], { APP_MODE: 'dev' }).mode).toBe('development');
        expect(argsOf(['--mode=staging']).mode).toBe('staging');
        expect(argsOf([], { NODE_ENV: 'unknown-mode' }).mode).toBeDefined();
    });

    it('resolves debug from env, args and the mode', () => {
        expect(argsOf([], { DEBUG: '1' }).debug).toBe(true);
        expect(argsOf([], { DEBUG: '0' }).debug).toBe(false);
        expect(argsOf(['--debug=true']).debug).toBe(true);
        expect(argsOf([], { NODE_ENV: 'development' }).debug).toBe(true);
    });

    it('reads env values with argument fallbacks', () => {
        const args = argsOf(['--APP_NAME=from-args', '--LOG_LEVEL=warn'], { APP_NAME: 'from-env' });

        expect(args.name).toBe('from-env');
        expect(args.logLevel).toBe('warn');
        expect(args.version).toBe('1.0.0');
    });

    it('defaults to no signal handlers', () => {
        expect(argsOf([]).signls).toEqual([]);
    });

    it('splits a comma separated signal list from env', () => {
        expect(argsOf([], { signls: 'SIGINT, SIGTERM' }).signls).toEqual(['SIGINT', 'SIGTERM']);
    });

    it('honours an explicit array of signals', () => {
        expect(argsOf([], { signls: ['SIGINT'] as any }).signls).toEqual(['SIGINT']);
    });

    it('re-parses on reset', () => {
        const args = argsOf(['--a=1', 'first']);
        args.reset(['--a=2', 'second']);

        expect(args.args).toEqual({ a: 2 });
        expect(args.cmds).toEqual(['second']);
    });

    it('lets mergeEnvironment override derived values', () => {
        const args = argsOf([]);
        args.mergeEnvironment({ baseURL: '/tmp/app', name: 'merged', mode: 'test' });

        expect(args.baseURL).toBe('/tmp/app');
        expect(args.name).toBe('merged');
        expect(args.mode).toBe('test');
        expect(args.platform).toBe('server');
        expect(args.pid).toBe(process.pid);
    });

});
