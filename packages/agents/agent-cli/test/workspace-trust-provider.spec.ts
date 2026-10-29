import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { provideWorkspaceTrust } from '../src/run-command';

function nodeFileAdapter() {
    return {
        isAbsolute: (value: string) => path.isAbsolute(value),
        normalize: (value: string) => path.normalize(value),
        join: (...values: string[]) => path.join(...values),
        resolve: (...values: string[]) => path.resolve(...values),
        extname: (value: string) => path.extname(value),
        existsSync: (value: string) => fs.existsSync(value),
        read: () => null as any,
        find: async () => null,
        readText: async (value: string) => fs.promises.readFile(value, 'utf8'),
        readTextSync: (value: string) => fs.readFileSync(value, 'utf8'),
        readJSON: async (value: string) => JSON.parse(fs.readFileSync(value, 'utf8')),
        readJSONSync: (value: string) => JSON.parse(fs.readFileSync(value, 'utf8')),
        writeText: async (value: string, content: string) => { fs.writeFileSync(value, content); },
        mkdir: async (value: string, options?: { recursive?: boolean }) => { fs.mkdirSync(value, options); },
        remove: async (value: string, options?: { recursive?: boolean; force?: boolean }) => { fs.rmSync(value, options); },
        stat: async () => null,
        list: async () => []
    } as any;
}

@Suite('workspace trust provider')
export class WorkspaceTrustProviderTest {
    @Test('resolves the platform FileAdapter through the application injector')
    async lazyFileAdapter() {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-trust-provider-'));
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-trust-workspace-'));
        try {
            const adapter = nodeFileAdapter();
            const provider = provideWorkspaceTrust(root) as any;
            expect(Array.isArray(provider.deps)).toEqual(true);
            expect(provider.deps.length).toEqual(1);

            const trust = provider.useFactory(adapter);
            expect(trust.isTrusted(workspace)).toEqual(false);
            trust.trust(workspace);
            expect(trust.isTrusted(workspace)).toEqual(true);
            const records = JSON.parse(fs.readFileSync(path.join(root, 'trusted-projects.json'), 'utf8'));
            expect(records.some((record: any) => record.path === workspace)).toEqual(true);

            // Without a host adapter the resolver must stay permissive for an
            // empty workspace and deny/nop instead of throwing.
            const detached = provider.useFactory(null);
            expect(detached.isTrusted('')).toEqual(true);
            expect(detached.isTrusted(workspace)).toEqual(false);
            detached.trust(workspace);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
