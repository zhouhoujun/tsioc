import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AGENT_HOOKS_FILE,
    AGENT_HOOKS_TRUST_FILE,
    applyAgentHooksTrust,
    hashAgentHook,
    readAgentHooksTrust,
    resolveAgentHooksTrustState
} from '../src/hooks/hooks-trust';

function writeJson(root: string, name: string, data: any): void {
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, name), JSON.stringify(data, null, 2));
}

@Suite('shared hooks trust manifest')
export class HooksTrustTest {
    @Test('hook hashes ignore the trusted flag and are definition-stable')
    hashes() {
        const hook = { command: 'npm test', timeoutMs: 5000 };
        const first = hashAgentHook('beforeTurn', hook);
        expect(hashAgentHook('beforeTurn', { ...hook, trusted: true })).toEqual(first);
        expect(hashAgentHook('beforeTurn', { timeoutMs: 5000, command: 'npm test' })).toEqual(first);
        expect(hashAgentHook('afterTurn', hook)).not.toEqual(first);
        // Editing the definition revokes trust.
        expect(hashAgentHook('beforeTurn', { ...hook, command: 'npm run build' })).not.toEqual(first);
    }

    @Test('reports declared hooks with their trust state')
    trustState() {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-hooks-trust-'));
        try {
            writeJson(root, AGENT_HOOKS_FILE, {
                beforeTurn: [{ command: 'npm test' }, { command: 'npm run lint' }],
                afterTool: { command: 'echo done' }
            });
            const trust = {
                version: 1,
                hooks: {
                    [hashAgentHook('beforeTurn', { command: 'npm test' })]: { stage: 'beforeTurn', trustedAt: 1 }
                }
            };
            writeJson(root, AGENT_HOOKS_TRUST_FILE, trust);

            const entries = resolveAgentHooksTrustState(root);
            expect(entries.length).toEqual(3);
            expect(entries[0]).toEqual({ stage: 'beforeTurn', name: 'npm test', trusted: true, trustedAt: 1 });
            expect(entries[1].trusted).toEqual(false);
            expect(entries[2]).toEqual({ stage: 'afterTool', name: 'echo done', trusted: false });

            // The shared annotator marks hooks and requires trust when a manifest exists.
            const annotated = applyAgentHooksTrust({
                beforeTurn: [{ command: 'npm test' }, { command: 'npm run lint' }]
            }, readAgentHooksTrust(root));
            expect(annotated.requireTrust).toEqual(true);
            expect(annotated.beforeTurn[0].trusted).toEqual(true);
            expect(annotated.beforeTurn[1].trusted).toEqual(false);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('returns no entries without a hooks file')
    missingFile() {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-hooks-trust-'));
        try {
            expect(resolveAgentHooksTrustState(root)).toEqual([]);
            expect(readAgentHooksTrust(root)).toEqual(undefined);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }
}
