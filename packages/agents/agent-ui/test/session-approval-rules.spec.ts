import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runApprovalRulesCommand } from '../src/AgentConsoleApprovalRuleCommands';

function localHost() {
    const store = new Map<string, any[]>();
    const manager = {
        setSessionRules: (sessionId: string, rules: any[]) => { store.set(sessionId, rules); },
        getSessionRules: (sessionId: string) => store.get(sessionId) || []
    };
    const overlays: Array<{ title: string; lines: string[] }> = [];
    const notices: string[] = [];
    const persisted: Array<Record<string, any>> = [];
    const host: any = {
        translator: null,
        state: {
            sessionId: 'session-1',
            openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines })
        },
        options: {},
        approvalManager: manager,
        notify: (message: string) => notices.push(message),
        rpcRequestContext: () => ({}),
        persistSettings: async (patch: Record<string, any>) => { persisted.push(patch); }
    };
    return { host, store, overlays, notices, persisted, manager };
}

@Suite('session approval rules command')
export class SessionApprovalRulesCommandTest {
    @Test('adds, lists, removes and clears rules for the active session')
    async localRules() {
        const { host, store, overlays, notices, persisted } = localHost();
        await runApprovalRulesCommand(host, 'session');
        expect(overlays[0].title).toEqual('Session approval rules');
        expect(overlays[0].lines[0]).toContain('No approval rules');

        await runApprovalRulesCommand(host, 'session add allow sandbox git *');
        expect(store.get('session-1')).toEqual([{ category: 'sandbox', action: 'allow', resource: 'git *' }]);
        expect(persisted[persisted.length - 1]).toEqual({
            sessionApprovalRules: { 'session-1': [{ category: 'sandbox', action: 'allow', resource: 'git *' }] }
        });
        expect(notices[notices.length - 1]).toContain('allow sandbox git *');

        await runApprovalRulesCommand(host, 'session');
        expect(overlays[overlays.length - 1].lines[0]).toContain('1. allow sandbox git *');
        expect(overlays[overlays.length - 1].lines.join('\n')).toContain('Workspace deny rules still win');

        await runApprovalRulesCommand(host, 'session remove 1');
        expect(store.get('session-1')).toEqual([]);

        await runApprovalRulesCommand(host, 'session add deny fs');
        await runApprovalRulesCommand(host, 'session clear');
        expect(store.get('session-1')).toEqual([]);
        expect(persisted[persisted.length - 1]).toEqual({ sessionApprovalRules: {} });
        expect(notices[notices.length - 1]).toContain('Cleared the session approval rules');
    }

    @Test('web/attach hosts use the gateway RPC')
    async remoteRules() {
        const calls: Array<{ method: string; params: any }> = [];
        let rules: any[] = [{ category: 'sandbox', action: 'ask' }];
        const persisted: Array<Record<string, any>> = [];
        const overlays: Array<{ title: string; lines: string[] }> = [];
        const host: any = {
            translator: null,
            state: { sessionId: 'session-1', openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines }) },
            options: {},
            appRpc: {
                request: async (method: string, params: any) => {
                    calls.push({ method, params });
                    if (method === 'session.approval_rules.get') {
                        return { sessionId: 'session-1', rules };
                    }
                    if (method === 'session.approval_rules.set') {
                        rules = params.rules;
                        return { sessionId: 'session-1', rules };
                    }
                    return null;
                }
            },
            notify: () => undefined,
            rpcRequestContext: () => ({}),
            persistSettings: async (patch: Record<string, any>) => { persisted.push(patch); }
        };
        await runApprovalRulesCommand(host, 'session add deny network');
        expect(calls[0].method).toEqual('session.approval_rules.get');
        expect(calls[1]).toEqual({
            method: 'session.approval_rules.set',
            params: {
                sessionId: 'session-1',
                rules: [
                    { category: 'sandbox', action: 'ask' },
                    { category: 'network', action: 'deny' }
                ]
            }
        });
        expect(persisted[persisted.length - 1]).toEqual({
            sessionApprovalRules: {
                'session-1': [
                    { category: 'sandbox', action: 'ask' },
                    { category: 'network', action: 'deny' }
                ]
            }
        });

        await runApprovalRulesCommand(host, 'session');
        expect(overlays[0].lines[0]).toContain('1. ask sandbox');
        expect(overlays[0].lines[1]).toContain('2. deny network');
    }
}
