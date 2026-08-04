import expect = require('expect');
import * as path from 'path';
import { AgentOrmModule, provideAgentOrmStorage } from '../src/orm.module';

describe('Agent ORM storage path', () => {
    it('pins provider and module storage to ~/.tsdi-agent/agent.db', () => {
        const originalHome = process.env.HOME;
        process.env.HOME = '/tmp/agent-orm-home';
        try {
            const providers = provideAgentOrmStorage('/custom/root', 'custom.db') as Array<{ useValue?: { location?: string } }>;
            const providerConnection = providers.find(provider => provider.useValue?.location);
            const moduleWithProviders = AgentOrmModule.withStorageRoot('/custom/root', 'custom.db');
            const moduleConnection = (moduleWithProviders.providers as Array<{ useValue?: { location?: string } }> | undefined)
                ?.find(provider => provider.useValue?.location);
            const expected = path.join('/tmp/agent-orm-home', '.tsdi-agent', 'agent.db');

            expect(providerConnection?.useValue?.location).toBe(expected);
            expect(moduleConnection?.useValue?.location).toBe(expected);
        } finally {
            process.env.HOME = originalHome;
        }
    });
});
