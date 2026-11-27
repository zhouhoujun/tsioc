import expect = require('expect');
import {
    applyConfigSchema,
    ConfigSchema,
    migrateConfig,
    validateConfigSchema
} from '../src/schema';
import { DefaultConfigurationManager } from '../src/manager';
import { MemoryConfigSource } from '../src/sources';

describe('config schema', () => {
    const schema: ConfigSchema = {
        version: 1,
        fields: {
            'server.port': { type: 'integer', required: true },
            'server.host': { type: 'string', default: '127.0.0.1' },
            'features.mode': { type: 'string', enum: ['basic', 'full'], default: 'basic' },
            'metrics.enabled': { type: 'boolean' }
        },
        migrations: {
            0: config => ({
                ...config,
                server: { ...(config.server ?? {}), port: Number(config.server?.port ?? 8080) }
            })
        }
    };

    it('migrates v0 documents and materializes defaults', () => {
        const result = applyConfigSchema({ server: { port: '8080' } }, schema);
        expect(result.config.schemaVersion).toBe(1);
        expect(result.config.server.port).toBe(8080);
        expect(result.config.server.host).toBe('127.0.0.1');
        expect(result.config.features.mode).toBe('basic');
        expect(result.warnings.join(' ')).toContain('migrated to v1');
    });

    it('rejects missing migrations and newer documents', () => {
        expect(() => migrateConfig({}, { version: 2, fields: {} })).toThrow(/no migration registered/);
        expect(() => migrateConfig({ schemaVersion: 2 }, schema)).toThrow(/newer than supported v1/);
    });

    it('returns actionable field errors', () => {
        const errors = validateConfigSchema({
            schemaVersion: 1,
            server: { port: 'not-a-number', host: 7 },
            features: { mode: 'enterprise' },
            metrics: { enabled: 'yes' }
        }, schema);
        expect(errors).toContain("server.port must be integer, got 'string'");
        expect(errors).toContain("server.host must be string, got 'integer'");
        expect(errors).toContain('features.mode must be one of "basic", "full", got \'enterprise\'');
        expect(errors).toContain("metrics.enabled must be boolean, got 'string'");
        expect(() => applyConfigSchema({ schemaVersion: 1, server: { port: 1 } }, {
            ...schema,
            fields: { ...schema.fields, 'server.port': { type: 'integer', required: true, enum: [1, 2] } }
        })).not.toThrow();
    });

    it('applies schema during manager load and exposes migration notes', async () => {
        const source = new MemoryConfigSource();
        source.setConfig({ server: { port: '9090' }, metrics: { enabled: true } });
        const manager = new DefaultConfigurationManager({ sources: [source], schema });
        await manager.load();

        expect(manager.get('server.port')).toBe(9090);
        expect(manager.get('server.host')).toBe('127.0.0.1');
        expect(manager.get('features.mode')).toBe('basic');
        expect(manager.getSchemaWarnings().join(' ')).toContain('migrated to v1');
    });

    it('fails manager load with a schema error for invalid values', async () => {
        const source = new MemoryConfigSource();
        source.setConfig({ server: { port: 'bad' } });
        const manager = new DefaultConfigurationManager({ sources: [source], schema });
        await expect(manager.load()).rejects.toThrow(/Invalid configuration/);
    });
});
