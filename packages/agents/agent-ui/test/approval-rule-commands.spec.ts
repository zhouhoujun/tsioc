import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    describeApprovalRule,
    openApprovalRulesPanel,
    parseApprovalRuleAdd,
    readEffectiveApprovalRules,
    runApprovalRulesCommand
} from '../src/AgentConsoleApprovalRuleCommands';

function createHost(options: any = {}) {
    const overlays: Array<{ title: string; lines: string[] }> = [];
    const notices: string[] = [];
    const rpc: Array<{ method: string; params: any }> = [];
    const persisted: any[] = [];
    return {
        overlays,
        notices,
        rpc,
        persisted,
        host: {
            translator: null,
            state: { openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines }) },
            options,
            appRpc: { request: async (method: string, params: any) => { rpc.push({ method, params }); return {}; } },
            notify: (message: string) => notices.push(message),
            rpcRequestContext: () => ({}),
            persistSettings: async (patch: any) => { persisted.push(patch); }
        }
    };
}

@Suite('approval rule commands')
export class ApprovalRuleCommandsTest {
    @Test('effective rules follow policy, legacy tools, then defaults')
    effectiveRules() {
        expect(readEffectiveApprovalRules({ policy: { approval: { requireApproval: ['custom'] } }, tools: { requireApproval: ['legacy'] } }))
            .toEqual(['custom']);
        expect(readEffectiveApprovalRules({ tools: { requireApproval: ['legacy'] } })).toEqual(['legacy']);
        const defaults = readEffectiveApprovalRules({});
        expect(defaults.length).toBeGreaterThan(0);
        expect(defaults).toContain('shell.exec');
    }

    @Test('parses string and ordered object rules')
    parsesAdds() {
        expect(parseApprovalRuleAdd(['terminal'])).toEqual({ rule: 'terminal' });
        expect(parseApprovalRuleAdd(['git', 'status*'])).toEqual({ rule: 'git status*' });
        expect(parseApprovalRuleAdd(['ask', 'sandbox'])).toEqual({ rule: { category: 'sandbox', action: 'ask' } });
        expect(parseApprovalRuleAdd(['allow', 'sandbox', 'git status*'])).toEqual({
            rule: { category: 'sandbox', action: 'allow', resource: 'git status*' }
        });
        expect(parseApprovalRuleAdd(['deny', 'bogus'])).toEqual({ error: "unknown category 'bogus'" });
        expect(parseApprovalRuleAdd([])).toEqual({ error: 'rule is empty' });
    }

    @Test('describes string and object rules')
    describes() {
        expect(describeApprovalRule('shell.exec')).toEqual('ask shell.exec');
        expect(describeApprovalRule({ category: 'sandbox', action: 'deny', resource: 'rm *' })).toEqual('deny sandbox rm *');
        expect(describeApprovalRule({ category: 'fs', names: ['write_file'], action: 'ask' })).toEqual('ask fs write_file');
    }

    @Test('lists, adds, removes and resets rules while persisting')
    async editRules() {
        const { host, overlays, notices, rpc, persisted } = createHost({ policy: { approval: {} } });
        await runApprovalRulesCommand(host as any, '');
        expect(overlays[0].lines.join('\n')).toContain('ask shell.exec');

        await runApprovalRulesCommand(host as any, 'add allow sandbox git status*');
        const rules = host.options.policy.approval.requireApproval;
        expect(rules[rules.length - 1]).toEqual({ category: 'sandbox', action: 'allow', resource: 'git status*' });
        expect(rpc[rpc.length - 1]).toEqual({
            method: 'settings.ui.set',
            params: { approvalRequireApproval: rules }
        });
        expect(persisted[persisted.length - 1]).toEqual({ approvalRequireApproval: rules });
        expect(notices[notices.length - 1]).toContain('allow sandbox git status*');

        const before = rules.length;
        await runApprovalRulesCommand(host as any, `remove ${before}`);
        expect(host.options.policy.approval.requireApproval.length).toEqual(before - 1);
        expect(notices[notices.length - 1]).toContain(`Removed approval rule ${before}`);

        await runApprovalRulesCommand(host as any, 'remove 99');
        expect(notices[notices.length - 1]).toContain('No approval rule at 99.');

        await runApprovalRulesCommand(host as any, 'clear');
        expect(notices[notices.length - 1]).toContain('clear confirm');
        await runApprovalRulesCommand(host as any, 'clear confirm');
        expect(host.options.policy.approval.requireApproval).toContain('shell.exec');
        expect(notices[notices.length - 1]).toContain('reset to defaults');
    }

    @Test('removing the last custom rule restores the safe defaults')
    async lastRuleResets() {
        const { host } = createHost({ policy: { approval: { requireApproval: ['custom'] } } });
        await runApprovalRulesCommand(host as any, 'remove 1');
        expect(host.options.policy.approval.requireApproval).toContain('shell.exec');
    }

    @Test('settings panel removes a rule or resets to defaults')
    async settingsPanel() {
        const { host, persisted, notices } = createHost({ policy: { approval: { requireApproval: ['terminal', 'fs.write'] } } });
        const picks = ['rule:0', 'remove'];
        (host as any).select = async () => picks.shift();
        await openApprovalRulesPanel(host as any);
        expect(host.options.policy.approval.requireApproval).toEqual(['fs.write']);
        expect(persisted[persisted.length - 1]).toEqual({ approvalRequireApproval: ['fs.write'] });
        expect(notices[notices.length - 1]).toContain('Removed approval rule 1');

        picks.push('__reset__');
        await openApprovalRulesPanel(host as any);
        expect(host.options.policy.approval.requireApproval).toContain('shell.exec');
        expect(notices[notices.length - 1]).toContain('reset to defaults');

        picks.push('__add__');
        await openApprovalRulesPanel(host as any);
        expect(notices[notices.length - 1]).toContain('/permissions rules add');
    }
}
