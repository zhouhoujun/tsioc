import { JoinpointState } from '@tsdi/aop';
import { LogAspect } from '../src/aspect';
import { LoggerManagers } from '../src/manager';
import { Logger } from '../src/logger';
import { LoggerManager } from '../src/LoggerManager';
import { LOG_CONFIGURES, LogConfigure } from '../src/LogConfigure';
import { Level } from '../src/Level';
import expect = require('expect');

interface Entry {
    level: string;
    messages: any[];
}

class RecordingLogger implements Logger {
    readonly category = 'test';
    readonly entries: Entry[] = [];
    constructor(public level: Level = 'debug') { }

    log(...messages: any[]): void { this.entries.push({ level: 'log', messages }); }
    trace(...messages: any[]): void { this.entries.push({ level: 'trace', messages }); }
    debug(...messages: any[]): void { this.entries.push({ level: 'debug', messages }); }
    info(...messages: any[]): void { this.entries.push({ level: 'info', messages }); }
    warn(...messages: any[]): void { this.entries.push({ level: 'warn', messages }); }
    error(...messages: any[]): void { this.entries.push({ level: 'error', messages }); }
    fatal(...messages: any[]): void { this.entries.push({ level: 'fatal', messages }); }
}

/** Formater that keeps messages untouched, so assertions see the raw payload. */
const identityFormater = {
    format: (_joinPoint: any, _level: any, _logger: any, ...messages: any[]) => messages
};

class TestAspect extends LogAspect {
    formatCalls = 0;

    constructor() {
        super();
        (this as any).mangers = { getConfigure: () => ({ format: identityFormater } as LogConfigure) };
    }

    emit(logger: Logger, joinPoint: any, level: Level, messages: any[], format = true): void {
        this.writeLog(logger, joinPoint as any, level, format, ...messages);
    }

    protected override formatMessage(joinPoint: any, logger: Logger, level: Level, ...messages: any[]): any[] {
        this.formatCalls += 1;
        return super.formatMessage(joinPoint, logger, level, ...messages);
    }
}

describe('LogAspect.writeLog', () => {

    it('skips formatting and emission when the logger filters the level out', () => {
        const aspect = new TestAspect();
        const logger = new RecordingLogger('info');

        aspect.emit(logger, { state: JoinpointState.Before }, 'debug', ['hidden']);

        expect(logger.entries.length).toBe(0);
        expect(aspect.formatCalls).toBe(0);
    });

    it('emits and formats when the level passes the logger threshold', () => {
        const aspect = new TestAspect();
        const logger = new RecordingLogger('info');

        aspect.emit(logger, { state: JoinpointState.Before }, 'info', ['shown']);

        expect(logger.entries).toEqual([{ level: 'info', messages: ['shown'] }]);
        expect(aspect.formatCalls).toBe(1);
    });

    it('uses the state level for entries without an explicit level', () => {
        const aspect = new TestAspect();
        const filtered = new RecordingLogger('info');
        const enabled = new RecordingLogger('debug');

        aspect.emit(filtered, { state: JoinpointState.Before }, '' as Level, ['state']);
        aspect.emit(enabled, { state: JoinpointState.Before }, '' as Level, ['state']);

        expect(filtered.entries.length).toBe(0);
        expect(enabled.entries).toEqual([{ level: 'debug', messages: ['state'] }]);
    });

    it('maps after-throwing entries to the error level', () => {
        const aspect = new TestAspect();
        const logger = new RecordingLogger('error');

        aspect.emit(logger, { state: JoinpointState.AfterThrowing }, '' as Level, ['boom']);

        expect(logger.entries).toEqual([{ level: 'error', messages: ['boom'] }]);
    });

    it('does not gate when the logger does not expose a known level', () => {
        const aspect = new TestAspect();
        const logger = new RecordingLogger();
        (logger as any).level = undefined;

        aspect.emit(logger, { state: JoinpointState.Before }, 'trace', ['always']);

        expect(logger.entries).toEqual([{ level: 'trace', messages: ['always'] }]);
    });

    it('keeps message order when formatting is disabled', () => {
        const aspect = new TestAspect();
        const logger = new RecordingLogger('warn');

        aspect.emit(logger, { state: JoinpointState.After }, 'warn', ['a', 1, 'b'], false);

        expect(logger.entries).toEqual([{ level: 'warn', messages: ['a', 1, 'b'] }]);
        expect(aspect.formatCalls).toBe(0);
    });

    it('writes synchronously, in call order', () => {
        const aspect = new TestAspect();
        const logger = new RecordingLogger('debug');

        aspect.emit(logger, { state: JoinpointState.Before }, 'debug', ['first']);
        const afterFirst = logger.entries.length;
        aspect.emit(logger, { state: JoinpointState.Before }, 'debug', ['second']);

        expect(afterFirst).toBe(1);
        expect(logger.entries.map(entry => entry.messages[0])).toEqual(['first', 'second']);
    });

});

class CountingManager implements LoggerManager {
    configureCalls = 0;
    lastConfig: any;
    loggers: string[] = [];

    configure(config: any): void {
        this.configureCalls += 1;
        this.lastConfig = config;
    }

    getLogger(name?: string): Logger {
        this.loggers.push(name ?? 'default');
        return new RecordingLogger();
    }
}

function createManagers(configs: LogConfigure[], manager: CountingManager): LoggerManagers {
    const injector = {
        has: (token: any) => token === LOG_CONFIGURES,
        get: (token: any) => token === LOG_CONFIGURES ? configs : manager
    };
    return new LoggerManagers(injector as any);
}

describe('LoggerManagers configuration', () => {

    it('applies a startup configuration once across repeated logger lookups', () => {
        const manager = new CountingManager();
        const config: LogConfigure['config'] = { level: 'info' as Level };
        const managers = createManagers([{ adapter: 'fake', config, asDefault: true }], manager);

        managers.getLogger('a', 'fake');
        managers.getLogger('b', 'fake');
        managers.getLogger('c', 'fake');

        expect(manager.configureCalls).toBe(1);
        expect(manager.lastConfig).toBe(config);
        expect(manager.loggers).toEqual(['a', 'b', 'c']);
    });

    it('applies the default adapter configuration once', () => {
        const manager = new CountingManager();
        const managers = createManagers([{ adapter: 'fake', config: { level: 'debug' }, asDefault: true }], manager);

        managers.getLogger('a');
        managers.getLogger('b');

        expect(manager.configureCalls).toBe(1);
    });

    it('applies an explicit configure call and does not re-apply it afterwards', () => {
        const manager = new CountingManager();
        const managers = createManagers([{ adapter: 'fake', config: { level: 'info' }, asDefault: true }], manager);

        managers.getLogger('a', 'fake');
        const runtimeConfig = { level: 'error' as Level };
        managers.configure(runtimeConfig, 'fake');
        managers.getLogger('b', 'fake');

        expect(manager.configureCalls).toBe(2);
        expect(manager.lastConfig).toBe(runtimeConfig);
    });

});
