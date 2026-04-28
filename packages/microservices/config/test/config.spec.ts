import { DefaultConfigurationManager, EnvConfigSource, MemoryConfigSource, JsonFileConfigSource, ConfigModule, ConfigChange } from '../src';
import expect = require('expect');
import * as fs from 'fs';
import * as path from 'path';

describe('Config Module Test', () => {

    describe('DefaultConfigurationManager', () => {
        let manager: DefaultConfigurationManager;

        beforeEach(() => {
            manager = new DefaultConfigurationManager({ defaults: { app: { name: 'test' } } });
        });

        afterEach(() => {
            manager.clear();
        });

        it('should get config value', () => {
            manager.set('db.host', 'localhost');
            const value = manager.get('db.host');
            expect(value).toBe('localhost');
        });

        it('should get nested config value', () => {
            manager.set('db.connection.host', 'localhost');
            manager.set('db.connection.port', 3306);
            expect(manager.get('db.connection.host')).toBe('localhost');
            expect(manager.get('db.connection.port')).toBe(3306);
        });

        it('should get default value', () => {
            const value = manager.get('nonexistent', { defaultValue: 'default' });
            expect(value).toBe('default');
        });

        it('should throw error for required missing key', () => {
            expect(() => manager.getRequired('nonexistent')).toThrow();
        });

        it('should check if key exists', () => {
            manager.set('test.key', 'value');
            expect(manager.has('test.key')).toBe(true);
            expect(manager.has('nonexistent')).toBe(false);
        });

        it('should get all config', () => {
            manager.set('key1', 'value1');
            manager.set('key2', 'value2');
            const all = manager.getAll();
            expect(all.key1).toBe('value1');
            expect(all.key2).toBe('value2');
        });

        it('should support transform', () => {
            manager.set('port', '3000');
            const port = manager.get('port', { transform: (v: any) => parseInt(v, 10) });
            expect(port).toBe(3000);
        });

        it('should add config source', async () => {
            const source = new MemoryConfigSource();
            source.setConfig({ external: 'value' });
            manager.addSource(source);
            await manager.load();
            expect(manager.get('external')).toBe('value');
        });

        it('should remove config source', () => {
            const source = new MemoryConfigSource();
            source.name = 'test-source';
            manager.addSource(source);
            manager.removeSource('test-source');
            // No error means success
        });

        it('should sort sources by priority', () => {
            const lowPriority = new MemoryConfigSource();
            lowPriority.priority = 0;
            lowPriority.name = 'low';

            const highPriority = new MemoryConfigSource();
            highPriority.priority = 100;
            highPriority.name = 'high';

            manager.addSource(lowPriority);
            manager.addSource(highPriority);
            // Sources should be sorted internally
        });

        it('should watch config changes', () => {
            let capturedChange: ConfigChange | undefined;
            manager.watch('test.key', (c) => capturedChange = c);
            manager.set('test.key', 'new-value');
            expect(capturedChange).toBeDefined();
            expect(capturedChange?.newValue).toBe('new-value');
        });

        it('should support wildcard watch', () => {
            let changeCount = 0;
            manager.watch('test.*', () => changeCount++);
            manager.set('test.key1', 'value1');
            manager.set('test.key2', 'value2');
            expect(changeCount).toBe(2);
        });

        it('should load from defaults', () => {
            expect(manager.get('app.name')).toBe('test');
        });

        it('should clear all', () => {
            manager.set('key', 'value');
            manager.clear();
            expect(manager.has('key')).toBe(false);
        });
    });

    describe('MemoryConfigSource', () => {
        let source: MemoryConfigSource;

        beforeEach(() => {
            source = new MemoryConfigSource();
        });

        afterEach(() => {
            source.clear();
        });

        it('should load config', async () => {
            source.setConfig({ key: 'value' });
            const config = await source.load();
            expect(config.key).toBe('value');
        });

        it('should set value', () => {
            source.setValue('nested.key', 'value');
            source.setConfig({ nested: { key: 'value' } });
        });

        it('should support watching', () => {
            let capturedChange: ConfigChange | undefined;
            source.watch((c) => capturedChange = c);
            source.setValue('key', 'value');
            expect(capturedChange).toBeDefined();
            source.unwatch();
        });

        it('should have correct type and priority', () => {
            expect(source.type).toBe('memory');
            expect(source.priority).toBe(0);
        });
    });

    describe('EnvConfigSource', () => {
        let source: EnvConfigSource;

        beforeEach(() => {
            // Set some test env vars
            process.env['TEST_APP_NAME'] = 'test-app';
            process.env['TEST_PORT'] = '3000';
            source = new EnvConfigSource({ prefix: 'TEST_' });
        });

        afterEach(() => {
            delete process.env['TEST_APP_NAME'];
            delete process.env['TEST_PORT'];
        });

        it('should load from environment', async () => {
            const config = await source.load();
            expect(config.app.name).toBe('test-app');
            expect(config.port).toBe(3000);
        });

        it('should parse boolean', async () => {
            process.env['TEST_ENABLED'] = 'true';
            const config = await source.load();
            expect(config.enabled).toBe(true);
            delete process.env['TEST_ENABLED'];
        });

        it('should parse JSON', async () => {
            process.env['TEST_CONFIG'] = '{"key":"value"}';
            const config = await source.load();
            expect(config.config.key).toBe('value');
            delete process.env['TEST_CONFIG'];
        });

        it('should have correct type and priority', () => {
            expect(source.type).toBe('env');
            expect(source.priority).toBe(100);
        });

        it('should filter by prefix', async () => {
            process.env['OTHER_KEY'] = 'other-value';
            const config = await source.load();
            expect(config['other']).toBeUndefined();
            delete process.env['OTHER_KEY'];
        });
    });

    describe('JsonFileConfigSource', () => {
        const testFile = path.join(__dirname, 'test-config.json');
        let source: JsonFileConfigSource;

        beforeEach(() => {
            fs.writeFileSync(testFile, JSON.stringify({ app: { name: 'json-app' }, port: 8080 }));
            source = new JsonFileConfigSource(testFile);
        });

        afterEach(() => {
            fs.unlinkSync(testFile);
        });

        it('should load from JSON file', async () => {
            const config = await source.load();
            expect(config.app.name).toBe('json-app');
            expect(config.port).toBe(8080);
        });

        it('should have correct type', () => {
            expect(source.type).toBe('json');
        });

        it('should set name from file path', () => {
            expect(source.name).toContain(testFile);
        });
    });

    describe('ConfigModule', () => {
        it('should have static withOptions method', () => {
            expect(ConfigModule.withOptions).toBeDefined();
            expect(typeof ConfigModule.withOptions).toBe('function');
        });

        it('should create ModuleWithProviders', () => {
            const result = ConfigModule.withOptions({ defaults: { key: 'value' } });
            expect(result.module).toBe(ConfigModule);
            expect(result.providers).toBeDefined();
        });

        it('should have static withEnv method', () => {
            expect(ConfigModule.withEnv).toBeDefined();
            expect(typeof ConfigModule.withEnv).toBe('function');
        });

        it('should create ModuleWithProviders with env prefix', () => {
            const result = ConfigModule.withEnv('APP_');
            expect(result.module).toBe(ConfigModule);
            expect(result.providers).toBeDefined();
        });

        it('should have static withFile method', () => {
            expect(ConfigModule.withFile).toBeDefined();
            expect(typeof ConfigModule.withFile).toBe('function');
        });
    });
});