import expect = require('expect');
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { AgentOrmModule, provideAgentOrmStorage } from '../src/orm.module';

function firstLocation(providers: unknown): string | undefined {
    return (providers as Array<{ useValue?: { location?: string } }>)
        .find(provider => provider.useValue?.location)?.useValue?.location;
}

describe('Agent ORM storage path', () => {
    it('places the database under an explicit root and falls back to HOME when root is empty', () => {
        const originalHome = process.env.HOME;
        process.env.HOME = '/tmp/agent-orm-home';
        const customRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-orm-root-'));
        try {
            const providers = provideAgentOrmStorage(customRoot, 'custom.db');
            const moduleWithProviders = AgentOrmModule.withStorageRoot(customRoot, 'custom.db');
            const expected = path.join(customRoot, 'custom.db');

            expect(firstLocation(providers)).toBe(expected);
            expect(firstLocation(moduleWithProviders.providers ?? [])).toBe(expected);

            expect(firstLocation(provideAgentOrmStorage('', 'agent.db')))
                .toBe(path.join('/tmp/agent-orm-home', '.tsdi-agent', 'agent.db'));
        } finally {
            process.env.HOME = originalHome;
            fs.rmSync(customRoot, { recursive: true, force: true });
        }
    });
});
