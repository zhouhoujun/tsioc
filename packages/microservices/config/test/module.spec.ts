import expect = require('expect');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { ConfigModule } from '../src/config.module';
import { ConfigurationManager } from '../src/manager';
import { ConfigSource } from '../src/config';

describe('ConfigModule wiring', () => {
    let ctx: ApplicationContext;

    afterEach(async () => {
        await ctx?.close();
        ctx = undefined as any;
    });

    it('applies defaults and sources from withOptions', async () => {
        @Module({
            imports: [ConfigModule.withOptions({
                defaults: { app: { name: 'svc' } },
                sources: [{
                    type: 'memory',
                    name: 'extra',
                    priority: 10,
                    enabled: true,
                    optional: false,
                    load: async () => ({ app: { port: 8080 } })
                } as ConfigSource]
            })]
        })
        class App { }

        ctx = await Application.run(App);
        const manager = ctx.get(ConfigurationManager);
        await manager.refresh();

        expect(manager.get('app.name')).toBe('svc');
        expect(manager.get('app.port')).toBe(8080);
    });

    it('loads a json file registered through withFile', async () => {
        const file = path.join(os.tmpdir(), `tsdi-config-${Date.now()}.json`);
        fs.writeFileSync(file, JSON.stringify({ feature: { enabled: true } }));
        try {
            @Module({
                imports: [ConfigModule.withFile(file)]
            })
            class App { }

            ctx = await Application.run(App);
            const manager = ctx.get(ConfigurationManager);
            await manager.refresh();
            expect(manager.get('feature.enabled')).toBe(true);
        } finally {
            fs.unlinkSync(file);
        }
    });

    it('registers env sources through withEnv', async () => {
        process.env.TSDI_TEST_CONFIG_VALUE = 'from-env';
        try {
            @Module({
                imports: [ConfigModule.withEnv('TSDI_TEST_')]
            })
            class App { }

            ctx = await Application.run(App);
            const manager = ctx.get(ConfigurationManager);
            await manager.refresh();
            expect(manager.get('config.value')).toBe('from-env');
        } finally {
            delete process.env.TSDI_TEST_CONFIG_VALUE;
        }
    });
});
