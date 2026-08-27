import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    compilePlan,
    inferEvidenceType,
    inferRiskLevel,
    splitAtomicFragments,
    autoNormalizeStep,
    defaultAcceptanceFor,
    PlanCompileResult
} from '../planning/plan-compiler';
import { TodoStore, TodoItem } from '../planning/todo-store';
import { TodoTool } from '../planning/todo.tool';

function item(id: string, overrides: Partial<TodoItem> = {}): TodoItem {
    return { id, content: `${id} content`, status: 'pending', ...overrides };
}

@Suite('evidence-aware plan compiler (P226)')
export class PlanCompilerTest {

    @Test('infers evidence kind from content')
    inferEvidence() {
        expect(inferEvidenceType('write a failing test for auth')).toBe('test');
        expect(inferEvidenceType('run tsc and lint the module')).toBe('diagnostic');
        expect(inferEvidenceType('review the proposed design')).toBe('review');
        expect(inferEvidenceType('refactor the controller and update the diff')).toBe('diff');
        expect(inferEvidenceType('implement the feature end to end')).toBe('diff');
    }

    @Test('infers risk level from content')
    inferRisk() {
        expect(inferRiskLevel('delete the user table')).toBe('high');
        expect(inferRiskLevel('rotate the api secret')).toBe('high');
        expect(inferRiskLevel('refactor the public api')).toBe('medium');
        expect(inferRiskLevel('document the config option')).toBe('low');
    }

    @Test('splits multi-action content into atomic fragments')
    splitFragments() {
        const parts = splitAtomicFragments('write the handler and then add a test');
        expect(parts.length).toBe(2);
        expect(parts[0]).toBe('write the handler');
        expect(parts[1]).toBe('add a test');
    }

    @Test('splits Chinese conjunction phrases')
    splitChineseFragments() {
        const parts = splitAtomicFragments('实现接口并且补充测试');
        expect(parts.length).toBe(2);
        expect(parts.join(' ')).toContain('实现接口');
        expect(parts.join(' ')).toContain('补充测试');
    }

    @Test('auto-normalize enriches evidence, risk and acceptance')
    normalize() {
        const step = autoNormalizeStep(item('a', { content: 'write a failing test for the login flow' }));
        expect(step.evidence).toBe('test');
        expect(step.proposed).toBe(false);
        expect(step.acceptance).toBeTruthy();
        expect(step.acceptance!.toLowerCase()).toContain('test');
    }

    @Test('compilePlan keeps single-action items accepted with no proposals')
    compileAtomic() {
        const result = compilePlan([item('a', { content: 'write a failing test for the login flow' })]);
        expect(result.rejected.length).toBe(0);
        expect(result.proposals.length).toBe(0);
        expect(result.accepted.length).toBe(1);
        expect(result.accepted[0].proposed).toBe(false);
        expect(result.accepted[0].evidence).toBe('test');
    }

    @Test('compilePlan splits multi-action item into proposals needing confirmation')
    compileMultiAction() {
        const result = compilePlan([item('m', { content: 'write the handler and then add a test' })]);
        expect(result.proposals.length).toBe(2);
        expect(result.accepted.length).toBe(0);
        expect(result.proposals.every(p => p.proposed === true)).toBe(true);
        expect(result.proposals.every(p => p.sourceItemId === 'm')).toBe(true);
    }

    @Test('compilePlan accepts all when acceptAll is set')
    compileAcceptAll() {
        const result = compilePlan(
            [item('m', { content: 'write the handler and then add a test' })],
            { acceptAll: true }
        );
        expect(result.accepted.length).toBe(2);
        expect(result.proposals.length).toBe(2);
    }

    @Test('splitAtomicFragments honors a custom conjunction override')
    splitCustomConjunctions() {
        expect(splitAtomicFragments('write a and then b', [';']).length).toBe(1);
        expect(splitAtomicFragments('write a ; b', [';']).length).toBe(2);
        expect(splitAtomicFragments('write a and then b', ['and then']).length).toBe(2);
    }

    @Test('compilePlan rejects empty / placeholder items')
    compileRejectsEmpty() {
        const result = compilePlan([item('e', { content: '(no description)' }), item('ok', { content: 'do the thing' })]) as PlanCompileResult;
        expect(result.rejected.length).toBe(1);
        expect(result.rejected[0].itemId).toBe('e');
        expect(result.accepted.length).toBe(1);
    }

    @Test('default acceptance derived per evidence kind')
    acceptance() {
        expect(defaultAcceptanceFor('run lint', 'diagnostic').toLowerCase()).toContain('checker');
        expect(defaultAcceptanceFor('add a test', 'test').toLowerCase()).toContain('verify');
        expect(defaultAcceptanceFor('implement x', 'diff').toLowerCase()).toContain('diff');
    }

    @Test('TodoTool decompose action returns compiled plan without persisting')
    async toolDecompose() {
        const store = new TodoStore();
        const tool = new TodoTool(store);
        const result = await tool.invoke({
            action: 'decompose',
            todos: [{ id: 'm', content: 'write the handler and then add a test', status: 'pending' }]
        }, { sessionId: 'decomp-s1' } as any) as PlanCompileResult;
        expect(result.proposals.length).toBe(2);
        expect(result.accepted.length).toBe(0);
        const persisted = await store.read('decomp-s1');
        expect(persisted.length).toBe(0);
    }

    @Test('TodoTool decompose with acceptAll compacts proposals into accepted')
    async toolDecomposeAcceptAll() {
        const tool = new TodoTool(new TodoStore());
        const result = await tool.invoke({
            action: 'decompose',
            acceptAll: true,
            todos: [{ id: 'm2', content: 'write the handler and then add a test', status: 'pending' }]
        }, { sessionId: 'decomp-s2' } as any) as PlanCompileResult;
        expect(result.accepted.length).toBe(2);
    }

    @Test('TodoTool validate action still returns quality + validation only')
    async toolValidate() {
        const tool = new TodoTool(new TodoStore());
        const result = await tool.invoke({
            action: 'validate',
            todos: [{ id: 'a', content: 'write a failing test for login', status: 'pending' }]
        }, { sessionId: 'validate-s1' } as any) as any;
        expect(result.quality).toBeDefined();
        expect(result.validation).toBeDefined();
        expect(result.proposals).toBeUndefined();
        expect(result.steps).toBeUndefined();
    }
}
