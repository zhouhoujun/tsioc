import expect = require('expect');
import { EnvConfigSource } from '../src/sources/env.source';

describe('EnvConfigSource', () => {
    beforeEach(() => {
        // Ensure test env vars don't leak
        delete process.env.TEST__MY__KEY;
        delete process.env.TEST_APP_NAME;
        delete process.env.TEST_APP_PORT;
    });

    it('type is env and priority is 100', () => {
        const source = new EnvConfigSource();
        expect(source.type).toBe('env');
        expect(source.priority).toBe(100);
    });

    it('name is env', () => {
        const source = new EnvConfigSource();
        expect(source.name).toBe('env');
    });

    it('load reads from process.env', async () => {
        process.env.TEST_APP_NAME = 'myapp';
        const source = new EnvConfigSource({ prefix: 'TEST' });
        const config = await source.load();
        expect(config.app.name).toBe('myapp');
    });

    it('load filters by prefix', async () => {
        process.env.TEST_APP_NAME = 'myapp';
        process.env.OTHER_VAR = 'ignored';
        const source = new EnvConfigSource({ prefix: 'TEST' });
        const config = await source.load();
        expect(config.app.name).toBe('myapp');
        expect(config.OTHER_VAR).toBeUndefined();
    });

    it('converts env key to dot notation', async () => {
        process.env.TEST_DB_HOST = 'localhost';
        const source = new EnvConfigSource({ prefix: 'TEST' });
        const config = await source.load();
        expect(config.db.host).toBe('localhost');
    });

    it('parses JSON strings', async () => {
        process.env.TEST_CONFIG = '{"key":"val"}';
        const source = new EnvConfigSource({ prefix: 'TEST' });
        const config = await source.load();
        expect(config.config).toEqual({ key: 'val' });
    });

    it('parses booleans', async () => {
        process.env.TEST_ENABLED = 'true';
        process.env.TEST_DISABLED = 'false';
        const source = new EnvConfigSource({ prefix: 'TEST' });
        const config = await source.load();
        expect(config.enabled).toBe(true);
        expect(config.disabled).toBe(false);
    });

    it('parses numbers', async () => {
        process.env.TEST_PORT = '8080';
        const source = new EnvConfigSource({ prefix: 'TEST' });
        const config = await source.load();
        expect(config.port).toBe(8080);
    });

    it('returns string for unparseable values', async () => {
        process.env.TEST_NAME = 'hello-world';
        const source = new EnvConfigSource({ prefix: 'TEST' });
        const config = await source.load();
        expect(config.name).toBe('hello-world');
    });

    it('works with custom separator', async () => {
        process.env['TEST__MY__KEY'] = 'value';
        const source = new EnvConfigSource({ prefix: 'TEST', separator: '__' });
        const config = await source.load();
        expect(config.my.key).toBe('value');
    });

    it('is optional by default', () => {
        const source = new EnvConfigSource();
        expect(source.optional).toBe(true);
    });
});
