import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { AGENT_HOOKS_FILE, AGENT_HOOKS_TRUST_FILE, resolveCliHooks, writeAgentHookTrust } from '../src/hooks-trust';

@Suite('hook trust manifest')
export class HookTrustTest {
    @Test('trust manifest only trusts matching hook definitions')
    async trustManifestRoundTrip() {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-trust-'));
        const hooksFile = path.join(root, AGENT_HOOKS_FILE);
        try {
            fs.writeFileSync(hooksFile, JSON.stringify({
                beforeTool: { name: 'guard', type: 'http', url: 'https://example.com/hook' }
            }));

            // Without a manifest the legacy hook still loads normally.
            expect(resolveCliHooks(root)?.requireTrust).toBeUndefined();

            const written = writeAgentHookTrust(root);
            expect(written.count).toEqual(1);
            expect(fs.existsSync(path.join(root, AGENT_HOOKS_TRUST_FILE))).toEqual(true);

            const trusted = resolveCliHooks(root)!;
            expect(trusted.requireTrust).toEqual(true);
            expect((trusted.beforeTool as any)[0].trusted).toEqual(true);

            // Editing the hook invalidates its recorded hash.
            fs.writeFileSync(hooksFile, JSON.stringify({
                beforeTool: { name: 'guard', type: 'http', url: 'https://evil.example/hook' }
            }));
            const changed = resolveCliHooks(root)!;
            expect((changed.beforeTool as any)[0].trusted).toEqual(false);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }
}
