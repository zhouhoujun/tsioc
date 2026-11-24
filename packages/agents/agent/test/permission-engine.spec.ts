import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { PermissionEngine, matchPermissionPattern, compileApprovalRules } from '../src/permissions/PermissionEngine';
import { DefaultApprovalStrategy } from '../src/tools/ApprovalStrategy';
import { compileArchetypePermissionRules } from '../src/permissions/archetype-rules';
import { ApprovalDecision, ToolApprovalManager } from '../src/tools/ToolApprovalManager';
import { RandomUuidGenerator } from '@tsdi/core';

@Suite('permission engine v3')
export class PermissionEngineTest {
    @Test('wildcard matches tool and resource patterns')
    wildcard() {
        expect(matchPermissionPattern('*', 'anything')).toEqual(true);
        expect(matchPermissionPattern('write_*', 'write_file')).toEqual(true);
        expect(matchPermissionPattern('write_*', 'read_file')).toEqual(false);
        expect(matchPermissionPattern('src/**', 'src/app/main.ts')).toEqual(true);
        expect(matchPermissionPattern('*.env', 'config/.env')).toEqual(true);
        expect(matchPermissionPattern('src', 'project/src')).toEqual(true);
    }

    @Test('layers evaluate in order and later matches win')
    layerOrder() {
        const engine = new PermissionEngine();
        engine.setLayer('default', [{ action: 'edit', effect: 'ask' }]);
        engine.setLayer('workspace', [{ action: 'edit', resource: 'src/**', effect: 'allow' }]);
        const src = engine.evaluate({ tool: 'edit_file', input: { path: 'src/app.ts' } });
        expect(src.effect).toEqual('allow');
        expect(src.layer).toEqual('workspace');
        engine.setLayer('saved', [{ action: 'edit', resource: 'src/**', effect: 'deny' }]);
        const denied = engine.evaluate({ tool: 'edit_file', input: { path: 'src/app.ts' } });
        expect(denied.effect).toEqual('deny');
        expect(denied.layer).toEqual('saved');
        const docs = engine.evaluate({ tool: 'edit_file', input: { path: 'docs/readme.md' } });
        expect(docs.effect).toEqual('ask');
    }

    @Test('a matched deny is a hard floor over later allows')
    denyHardFloor() {
        const engine = new PermissionEngine();
        engine.setLayer('workspace', [{ action: 'shell', resource: 'rm *', effect: 'deny' }]);
        engine.setLayer('saved', [{ action: 'shell', effect: 'allow' }]);
        const decision = engine.evaluate({ tool: 'terminal', input: { command: 'rm -rf build' } });
        expect(decision.matched).toEqual(true);
        expect(decision.effect).toEqual('allow');
        expect(decision.denied).toEqual(true);
    }

    @Test('semantic actions derive from tool names and categories')
    semanticActions() {
        const engine = new PermissionEngine();
        engine.setLayer('workspace', [
            { action: 'read', resource: '*.md', effect: 'allow' },
            { action: 'shell', resource: 'git status', effect: 'allow' }
        ]);
        expect(engine.evaluate({ tool: 'read_file', input: { path: 'docs/a.md' } }).effect).toEqual('allow');
        expect(engine.evaluate({ tool: 'terminal', input: { command: 'git status' } }).effect).toEqual('allow');
        expect(engine.evaluate({ tool: 'terminal', input: { command: 'git push' } }).effect).toBeUndefined();
    }

    @Test('legacy category rules compile into tool-constrained actions')
    compileLegacy() {
        const compiled = compileApprovalRules([{ category: 'sandbox', names: ['terminal'], resource: 'rm*', action: 'deny' }], 'workspace');
        expect(compiled.length).toEqual(1);
        expect(compiled[0]).toMatchObject({ action: 'shell', tool: 'terminal', resource: 'rm*', effect: 'deny', layer: 'workspace' });
    }
}

@Suite('approval strategy uses permission rules')
export class ApprovalPermissionRulesTest {
    @Test('workspace allow rules resolve an otherwise required tool')
    workspaceAllow() {
        const strategy = new DefaultApprovalStrategy(['shell.exec']);
        strategy.setPermissionRules([{ action: 'shell', resource: 'git status*', effect: 'allow' }]);
        expect(strategy.requires('terminal', { command: 'git status' })).toEqual(false);
        expect(strategy.requires('terminal', { command: 'rm -rf build' })).toEqual(true);
    }

    @Test('deny rules auto-deny regardless of project allow list')
    denyWins() {
        const strategy = new DefaultApprovalStrategy(['shell.exec']);
        strategy.setPermissionRules([{ action: 'shell', resource: 'rm *', effect: 'deny' }]);
        expect(strategy.autoDenies('terminal', { command: 'rm -rf build' })).toEqual(true);
        expect(strategy.requires('terminal', { command: 'rm -rf build' })).toEqual(true);
    }

    @Test('session rules are evaluated in the session layer')
    sessionLayer() {
        const strategy = new DefaultApprovalStrategy(['shell.exec']);
        strategy.setPermissionRules([]);
        strategy.setSessionRules('s1', [{ category: 'sandbox', names: ['terminal'], resource: 'git log*', action: 'allow' }]);
        expect(strategy.requires('terminal', { command: 'git log -1' }, 's1')).toEqual(false);
        expect(strategy.explain('terminal', { command: 'git log -1' }, 's1').permission?.layer).toEqual('session');
    }

    @Test('saved allow patterns form the last layer')
    savedLayer() {
        const strategy = new DefaultApprovalStrategy(['shell.exec']);
        strategy.setSavedAllowPatterns(['terminal']);
        expect(strategy.requires('terminal', { command: 'rm -rf build' })).toEqual(false);
    }

    @Test('unattended ruleset resolves requests immediately without pending entries')
    async unattendedRuleset() {
        for (const [mode, expected] of [['deny', ApprovalDecision.DENIED], ['allow', ApprovalDecision.APPROVED]] as const) {
            const manager = new ToolApprovalManager(
                { publishEvent: async () => undefined } as any,
                new RandomUuidGenerator(),
                new DefaultApprovalStrategy(['shell.exec']),
                { unattended: mode }
            );
            const result = await manager.checkApproval('terminal', { command: 'rm -rf build' }, 's1');
            expect(result.decision).toEqual(expected);
            expect(manager.getPending()).toEqual([]);
        }
    }

    @Test('archetype deny rules compile into the agent layer as a hard floor')
    archetypeAgentLayer() {
        const compiled = compileArchetypePermissionRules({ name: 'plan', permissions: { deny: ['terminal', 'write_*'] } } as any);
        expect(compiled.map(rule => [rule.action, rule.resource, rule.effect, rule.layer])).toEqual([
            ['tool', 'terminal', 'deny', 'agent'],
            ['tool', 'write_*', 'deny', 'agent']
        ]);

        const strategy = new DefaultApprovalStrategy(['shell.exec']);
        strategy.setPermissionLayer('agent', () => compiled);
        strategy.setSavedAllowPatterns(['terminal']);
        expect(strategy.autoDenies('terminal', {})).toEqual(true);
        expect(strategy.requires('terminal', {})).toEqual(true);
        expect(strategy.requires('read_file', { path: 'a.ts' })).toEqual(false);
        expect(strategy.explain('terminal', {}).permission?.denied).toEqual(true);
    }

    @Test('manager saved allow rules feed the saved layer')
    managerSavedRules() {
        const strategy = new DefaultApprovalStrategy(['shell.exec']);
        const manager = new ToolApprovalManager(
            { publishEvent: async () => undefined } as any,
            new RandomUuidGenerator(),
            strategy
        );
        manager.setAllowRules(['terminal']);
        expect(strategy.requires('terminal', { command: 'rm -rf build' })).toEqual(false);
    }

    @Test('a rejection can carry user feedback for the tool error')
    async rejectFeedback() {
        const manager = new ToolApprovalManager(
            { publishEvent: async () => undefined } as any,
            new RandomUuidGenerator(),
            new DefaultApprovalStrategy(['shell.exec'])
        );
        const pending = manager.checkApproval('terminal', { command: 'rm -rf build' }, 's1');
        const request = manager.getPending()[0];
        expect(!!request).toEqual(true);
        manager.reject(request.id, 'use a safer path');
        const result = await pending;
        expect(result.decision).toEqual(ApprovalDecision.DENIED);
        expect(result.feedback).toEqual('use a safer path');
    }

    @Test('live permission source applies edits without rebuilding')
    liveSource() {
        let rules: any[] = [];
        const strategy = new DefaultApprovalStrategy(['shell.exec']);
        strategy.setPermissionRules(() => rules);
        expect(strategy.requires('terminal', { command: 'git status' })).toEqual(true);
        rules = [{ action: 'shell', effect: 'allow' }];
        expect(strategy.requires('terminal', { command: 'git status' })).toEqual(false);
    }
}
