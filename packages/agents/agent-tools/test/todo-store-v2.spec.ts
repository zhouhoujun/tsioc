import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TodoStore, TodoItem, validateTodos, TodoValidationResult, validatePlanQuality, PlanQualityResult, resolveSchedule, TodoScheduleResult } from '../planning/todo-store';
import { TodoTool } from '../planning/todo.tool';
import { AgentModule, MemoryStore, provideAgentOrm } from '@tsdi/agent';
import { Application } from '@tsdi/core';

function createSessionContext(opts: { sessionId?: string } = {}): any {
    return { sessionId: opts.sessionId || 'test-session' };
}

function item(id: string, overrides: Partial<TodoItem> = {}): TodoItem {
    return { id, content: `${id} content`, status: 'pending', ...overrides };
}

@Suite('todo store v2 schema (P203)')
export class TodoStoreV2Test {

    @Test('v1 items read back without v2 fields')
    async v1ItemsReadBackWithoutV2Fields() {
        const store = new TodoStore();
        await store.replace('s1', [
            { id: 'a', content: 'legacy a', status: 'pending' },
            { id: 'b', content: 'legacy b', status: 'completed' }
        ]);
        const todos = await store.read('s1');
        expect(todos.length).toBe(2);
        expect(todos[0].parentId).toBeUndefined();
        expect(todos[0].dependsOn).toBeUndefined();
        expect(todos[0].kind).toBeUndefined();
        expect(todos[1].acceptance).toBeUndefined();
    }

    @Test('v2 fields are persisted through replace')
    async v2FieldsPersistedThroughReplace() {
        const store = new TodoStore();
        await store.replace('s2', [
            {
                id: 'x1', content: 'step 1', status: 'pending',
                parentId: 'root', kind: 'task', acceptance: 'tests pass',
                dependsOn: [], estimate: '1h', owner: 'agent-a'
            },
            {
                id: 'x2', content: 'step 2', status: 'pending',
                dependsOn: ['x1'], kind: 'milestone', updatedAt: 1234567890
            }
        ]);
        const todos = await store.read('s2');
        expect(todos.length).toBe(2);
        expect(todos[0].parentId).toBe('root');
        expect(todos[0].kind).toBe('task');
        expect(todos[0].acceptance).toBe('tests pass');
        expect(todos[0].dependsOn).toBeUndefined();
        expect(todos[0].estimate).toBe('1h');
        expect(todos[0].owner).toBe('agent-a');
        expect(todos[1].dependsOn).toEqual(['x1']);
        expect(todos[1].kind).toBe('milestone');
        expect(todos[1].updatedAt).toBe(1234567890);
    }

    @Test('v2 fields are persisted through merge')
    async v2FieldsPersistedThroughMerge() {
        const store = new TodoStore();
        await store.replace('s3', [
            { id: 'm1', content: 'original', status: 'pending', kind: 'task' }
        ]);
        await store.merge('s3', [
            { id: 'm1', content: 'updated', status: 'in_progress', kind: 'bug', owner: 'agent-b', estimate: '30m' }
        ]);
        const todos = await store.read('s3');
        expect(todos[0].content).toBe('updated');
        expect(todos[0].kind).toBe('bug');
        expect(todos[0].owner).toBe('agent-b');
        expect(todos[0].estimate).toBe('30m');
    }

    @Test('merge preserves content and status when a status-only update omits them')
    async mergePreservesOmittedFields() {
        const store = new TodoStore();
        await store.replace('s3b', [
            { id: 'a', content: 'keep my content', status: 'pending' },
            { id: 'b', content: 'second', status: 'in_progress' }
        ]);
        await store.merge('s3b', [
            { id: 'a', status: 'completed' },
            { id: 'b', status: 'pending' }
        ]);
        const todos = await store.read('s3b');
        expect(todos[0].content).toBe('keep my content');
        expect(todos[0].status).toBe('completed');
        expect(todos[1].content).toBe('second');
        expect(todos[1].status).toBe('pending');
    }

    @Test('TodoTool rejects a new todo item without content')
    async todoToolRejectsContentlessNewItem() {
        const tool = new TodoTool();
        let error: Error | undefined;
        try {
            await tool.invoke({ todos: [{ id: 'a', status: 'pending' }] }, createSessionContext({ sessionId: 'content-guard' }));
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('content is required');
    }

    @Test('TodoTool allows a status-only update for an existing item')
    async todoToolAllowsStatusOnlyUpdate() {
        const tool = new TodoTool();
        const ctx = createSessionContext({ sessionId: 'status-only' });
        await tool.invoke({ todos: [{ id: 'a', content: 'do a', status: 'pending' }] }, ctx);
        await tool.invoke({ merge: true, todos: [{ id: 'a', status: 'completed' }] }, ctx);
        const result: any = await tool.invoke({}, ctx);
        expect(result.todos[0].content).toBe('do a');
        expect(result.todos[0].status).toBe('completed');
    }

    @Test('normalizeItem rejects invalid kind')
    async normalizeRejectsInvalidKind() {
        const store = new TodoStore();
        await store.replace('s4', [
            { id: 'bad', content: 'bad kind', status: 'pending', kind: 'invalid_kind' }
        ]);
        const todos = await store.read('s4');
        expect(todos[0].kind).toBeUndefined();
    }

    @Test('normalizeItem trims whitespace from v2 fields')
    async normalizeTrimsWhitespace() {
        const store = new TodoStore();
        await store.replace('s5', [
            { id: 'trim', content: 'trim test', status: 'pending', parentId: '  root  ', owner: '  agent  ', estimate: '  1h  ' }
        ]);
        const todos = await store.read('s5');
        expect(todos[0].parentId).toBe('root');
        expect(todos[0].owner).toBe('agent');
        expect(todos[0].estimate).toBe('1h');
    }

    @Test('validateTodos returns valid for clean list')
    testValidateClean() {
        const result = validateTodos([
            item('a'),
            item('b', { status: 'completed' }),
            item('c', { status: 'in_progress' })
        ]);
        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
    }

    @Test('validateTodos detects duplicate ids')
    testValidateDuplicateIds() {
        const result = validateTodos([
            item('dup'),
            item('dup'),
            item('ok')
        ]);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Duplicate id'))).toBe(true);
    }

    @Test('validateTodos detects missing dependency')
    testValidateMissingDep() {
        const result = validateTodos([
            item('a', { dependsOn: ['nonexistent'] })
        ]);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('missing item'))).toBe(true);
    }

    @Test('validateTodos detects missing parent')
    testValidateMissingParent() {
        const result = validateTodos([
            item('child', { parentId: 'ghost' })
        ]);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('missing parent'))).toBe(true);
    }

    @Test('validateTodos detects dependency cycle')
    testValidateCycle() {
        const result = validateTodos([
            item('a', { dependsOn: ['b'] }),
            item('b', { dependsOn: ['c'] }),
            item('c', { dependsOn: ['a'] })
        ]);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('cycle'))).toBe(true);
    }

    @Test('validateTodos detects multiple in_progress')
    testValidateMultipleInProgress() {
        const result = validateTodos([
            item('a', { status: 'in_progress' }),
            item('b', { status: 'in_progress' })
        ]);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Multiple items in_progress'))).toBe(true);
    }

    @Test('validateTodos detects in_progress with unfinished dependency')
    testValidateInProgressWithUnfinishedDep() {
        const result = validateTodos([
            item('a', { status: 'pending' }),
            item('b', { status: 'in_progress', dependsOn: ['a'] })
        ]);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('unfinished dependencies'))).toBe(true);
    }

    @Test('validateTodos allows in_progress with completed dependency')
    testValidateInProgressWithCompletedDep() {
        const result = validateTodos([
            item('a', { status: 'completed' }),
            item('b', { status: 'in_progress', dependsOn: ['a'] })
        ]);
        expect(result.valid).toBe(true);
    }

    @Test('validateTodos allows in_progress with cancelled dependency')
    testValidateInProgressWithCancelledDep() {
        const result = validateTodos([
            item('a', { status: 'cancelled' }),
            item('b', { status: 'in_progress', dependsOn: ['a'] })
        ]);
        expect(result.valid).toBe(true);
    }

    @Test('validate method on store reads and validates')
    async storeValidateMethod() {
        const store = new TodoStore();
        await store.replace('v1', [
            item('a', { dependsOn: ['ghost'] })
        ]);
        const result = await store.validate('v1');
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('missing item'))).toBe(true);
    }

    @Test('TodoTool returns validation in result')
    async todoToolReturnsValidation() {
        const store = new TodoStore();
        const tool = new TodoTool(store);
        await tool.invoke({
            todos: [
                { id: 'a', content: 'valid item', status: 'pending' }
            ]
        }, createSessionContext({ sessionId: 'vt1' }));
        const result = await tool.invoke(undefined, createSessionContext({ sessionId: 'vt1' }));
        expect(result.validation).toBeDefined();
        expect(result.validation.valid).toBe(true);
    }

    @Test('TodoTool detects invalid plan in result')
    async todoToolDetectsInvalidPlan() {
        const store = new TodoStore();
        const tool = new TodoTool(store);
        await tool.invoke({
            todos: [
                { id: 'a', content: 'item a', status: 'pending', dependsOn: ['nonexistent'] }
            ]
        }, createSessionContext({ sessionId: 'vt2' }));
        const result = await tool.invoke(undefined, createSessionContext({ sessionId: 'vt2' }));
        expect(result.validation.valid).toBe(false);
    }

    @Test('old v1 session data is readable after v2 code is deployed')
    async v1BackwardCompat() {
        const store = new TodoStore();
        const v1Data = [
            { id: 'old-1', content: 'legacy item 1', status: 'pending' },
            { id: 'old-2', content: 'legacy item 2', status: 'completed' },
            { id: 'old-3', content: 'legacy item 3', status: 'in_progress' }
        ];
        await store.replace('legacy-session', v1Data);
        const read = await store.read('legacy-session');
        expect(read.length).toBe(3);
        expect(read[0].id).toBe('old-1');
        expect(read[0].status).toBe('pending');
        expect(read[1].id).toBe('old-2');
        expect(read[1].status).toBe('completed');
        expect(read[2].id).toBe('old-3');
        expect(read[2].status).toBe('in_progress');
        const summary = await store.summarize('legacy-session');
        expect(summary.pending).toBe(1);
        expect(summary.completed).toBe(1);
        expect(summary.in_progress).toBe(1);
    }

    @Test('edge case: empty dependsOn array is ignored')
    async emptyDependsOnIgnored() {
        const store = new TodoStore();
        await store.replace('edge1', [
            item('e1', { dependsOn: [] })
        ]);
        const todos = await store.read('edge1');
        expect(todos[0].dependsOn).toBeUndefined();
    }

    @Test('edge case: null/undefined optional fields normalize away')
    async nullOptionalFieldsNormalizeAway() {
        const store = new TodoStore();
        await store.replace('edge2', [
            { id: 'e2', content: 'test', status: 'pending', parentId: null, owner: undefined, kind: '' }
        ]);
        const todos = await store.read('edge2');
        expect(todos[0].parentId).toBeUndefined();
        expect(todos[0].owner).toBeUndefined();
        expect(todos[0].kind).toBeUndefined();
    }

    @Test('multiple errors collected in single validation')
    async multipleErrorsCollected() {
        const result = validateTodos([
            { id: 'dup', content: 'a', status: 'pending' },
            { id: 'dup', content: 'b', status: 'in_progress' },
            { id: 'orphan', content: 'c', status: 'pending', dependsOn: ['ghost'] },
            { id: 'bad-parent', content: 'd', status: 'pending', parentId: 'nope' }
        ]);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
}

@Suite('plan quality gate (P204)')
export class PlanQualityGateTest {

    @Test('empty list returns valid with score 100')
    testEmptyValid() {
        const result = validatePlanQuality([]);
        expect(result.valid).toBe(true);
        expect(result.score).toBe(100);
        expect(result.suggestions.length).toBe(0);
    }

    @Test('single good item passes with high score')
    testSingleGoodItem() {
        const result = validatePlanQuality([
            { id: '1', content: 'Write unit tests for the auth module', status: 'pending', acceptance: 'All edge cases covered' }
        ]);
        expect(result.valid).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(85);
    }

    @Test('short content triggers warning')
    testShortContent() {
        const result = validatePlanQuality([
            { id: '1', content: 'Fix bug', status: 'pending' }
        ]);
        expect(result.suggestions.some(s => s.itemId === '1' && s.message.includes('too short'))).toBe(true);
    }

    @Test('multi-action content triggers error')
    testMultiActionContent() {
        const result = validatePlanQuality([
            { id: '1', content: 'Write auth module and then add tests for it', status: 'pending' }
        ]);
        expect(result.valid).toBe(false);
        expect(result.suggestions.some(s => s.itemId === '1' && s.severity === 'error' && s.message.includes('multiple actions'))).toBe(true);
    }

    @Test('missing acceptance criteria triggers info')
    testMissingAcceptance() {
        const result = validatePlanQuality([
            { id: '1', content: 'Implement the login endpoint with validation', status: 'pending' }
        ]);
        expect(result.suggestions.some(s => s.itemId === '1' && s.severity === 'info' && s.message.includes('acceptance'))).toBe(true);
        expect(result.score).toBeLessThan(100);
    }

    @Test('completed items do not require acceptance')
    testCompletedNoAcceptance() {
        const result = validatePlanQuality([
            { id: '1', content: 'Implement the login endpoint', status: 'completed' }
        ]);
        expect(result.suggestions.some(s => s.itemId === '1' && s.message.includes('acceptance'))).toBe(false);
    }

    @Test('duplicate content detected')
    testDuplicateContent() {
        const result = validatePlanQuality([
            { id: '1', content: 'Write tests for auth module', status: 'pending' },
            { id: '2', content: 'Write tests for auth module', status: 'pending' }
        ]);
        expect(result.valid).toBe(false);
        expect(result.suggestions.some(s => s.severity === 'error' && s.message.includes('Duplicate'))).toBe(true);
    }

    @Test('out-of-order dependency triggers warning')
    testDependencyOrder() {
        const result = validatePlanQuality([
            { id: 'b', content: 'Second step that depends on first', status: 'pending', dependsOn: ['a'] },
            { id: 'a', content: 'First step that should come before', status: 'pending' }
        ]);
        expect(result.suggestions.some(s => s.itemId === 'b' && s.message.includes('appears later'))).toBe(true);
    }

    @Test('in-order dependency does not trigger warning')
    testDependencyInOrder() {
        const result = validatePlanQuality([
            { id: 'a', content: 'First step that should come before', status: 'pending' },
            { id: 'b', content: 'Second step that depends on first', status: 'pending', dependsOn: ['a'] }
        ]);
        expect(result.suggestions.some(s => s.message.includes('appears later'))).toBe(false);
    }

    @Test('long content triggers warning')
    testLongContent() {
        const long = 'A'.repeat(350);
        const result = validatePlanQuality([
            { id: '1', content: long, status: 'pending' }
        ]);
        expect(result.suggestions.some(s => s.itemId === '1' && s.message.includes('very long'))).toBe(true);
    }

    @Test('valid plan gives high score')
    testValidPlanHighScore() {
        const result = validatePlanQuality([
            { id: '1', content: 'Write the database migration script', status: 'pending', acceptance: 'Migration runs cleanly' },
            { id: '2', content: 'Update ORM models to match schema', status: 'pending', dependsOn: ['1'], acceptance: 'Type checks pass' },
            { id: '3', content: 'Add integration tests for new fields', status: 'pending', dependsOn: ['2'], acceptance: 'Tests pass with coverage' }
        ]);
        expect(result.valid).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(85);
    }

    @Test('TodoTool action validate returns quality without persisting')
    async todoToolActionValidate() {
        const store = new TodoStore();
        const tool = new TodoTool(store);
        const result = await tool.invoke({
            action: 'validate',
            todos: [
                { id: '1', content: 'Fix bug', status: 'pending' }
            ]
        }, createSessionContext({ sessionId: 'qg1' }));
        expect(result.quality).toBeDefined();
        expect(result.quality.suggestions.length).toBeGreaterThan(0);
        expect(result.validation).toBeDefined();
        const persisted = await store.read('qg1');
        expect(persisted.length).toBe(0);
    }

    @Test('TodoTool action decompose returns compiled plan without persisting')
    async todoToolActionDecompose() {
        const store = new TodoStore();
        const tool = new TodoTool(store);
        const result = await tool.invoke({
            action: 'decompose',
            todos: [
                { id: '1', content: 'Write auth module and then add tests', status: 'pending' }
            ]
        }, createSessionContext({ sessionId: 'qg2' }));
        expect(result.steps).toBeDefined();
        expect(result.proposals.length).toBeGreaterThan(0);
        const persisted = await store.read('qg2');
        expect(persisted.length).toBe(0);
    }

    @Test('normal replace now includes quality in result')
    async normalReplaceIncludesQuality() {
        const store = new TodoStore();
        const tool = new TodoTool(store);
        const result = await tool.invoke({
            todos: [
                { id: '1', content: 'Write auth module', status: 'pending', acceptance: 'Tests pass' }
            ]
        }, createSessionContext({ sessionId: 'qg3' }));
        expect(result.quality).toBeDefined();
        expect(result.quality.valid).toBe(true);
        expect(result.todos.length).toBe(1);
    }

    @Test('plan snapshots advance revisions and reject stale replace/merge writes')
    async planRevisionRejectsStaleWrites() {
        const store = new TodoStore();
        const first = await store.readPlan('rev1');
        expect(first.revision).toBe(0);
        await store.replace('rev1', [item('a')]);
        const current = await store.readPlan('rev1');
        expect(current.revision).toBe(1);
        const stale = await store.replaceAtRevision('rev1', [item('b')], 0);
        expect((stale as any).conflict).toBe(true);
        const merged = await store.mergeAtRevision('rev1', [item('b')], current.revision);
        expect(Array.isArray(merged)).toBe(true);
        const tool = new TodoTool(store);
        const conflict = await tool.invoke({ todos: [item('c')], expectedRevision: 1 }, createSessionContext({ sessionId: 'rev1' }));
        expect(conflict.conflict).toBe(true);
    }

    @Test('todo tool result exposes planId and revision for revision-aware consumers')
    async todoToolExposesPlanRevision() {
        const store = new TodoStore();
        const tool = new TodoTool(store);
        await tool.invoke({ todos: [item('r1')] }, createSessionContext({ sessionId: 'rev2' }));
        const result = await tool.invoke({}, createSessionContext({ sessionId: 'rev2' }));
        expect(result.planId).toBe('plan:rev2');
        expect(result.revision).toBe(1);
        expect(result.todos.length).toBe(1);
    }

    @Test('expectedRevision write advances revision after success')
    async expectedRevisionWriteAdvances() {
        const store = new TodoStore();
        await store.replace('rev3', [item('a')]);
        let current = await store.readPlan('rev3');
        expect(current.revision).toBe(1);
        const ok = await store.replaceAtRevision('rev3', [item('a'), item('b')], 1);
        expect(Array.isArray(ok)).toBe(true);
        current = await store.readPlan('rev3');
        expect(current.revision).toBe(2);
    }

    @Test('revision wrap without conflict guard still advances (non-revision callers)')
    async nonRevisionCallersStillAdvance() {
        const store = new TodoStore();
        await store.replace('rev4', [item('a')]);
        await store.replace('rev4', [item('b')]);
        const current = await store.readPlan('rev4');
        expect(current.revision).toBe(2);
        const ok = await store.replaceAtRevision('rev4', [item('c')], undefined);
        expect(Array.isArray(ok)).toBe(true);
    }
}

@Suite('todo store revision migration v3 (P225)')
export class TodoStoreRevisionMigrationTest {

    @Test('legacy array payload migrates to version 3 on next persist and reads with revision')
    async legacyArrayPayloadMigrates() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const memory = ctx.get(MemoryStore);
        try {
        const legacy = [
            { id: 'a', content: 'legacy a', status: 'completed' },
            { id: 'b', content: 'legacy b', status: 'pending' }
        ];
        await memory.put({
            id: 'agent-todo:mig1',
            sessionId: 'mig1',
            key: 'agent.todo.plan',
            value: JSON.stringify(legacy),
            scope: 'session',
            namespace: 'agent',
            category: 'conversation',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        const store = new TodoStore(memory as any);
        const plan = await store.readPlan('mig1');
        expect(plan.todos.length).toBe(2);
        expect(plan.planId).toBe('plan:mig1');
        expect(plan.revision).toBe(1);
        } finally { await ctx.close(); }
    }

    @Test('revision survives re-read from persisted store after writes')
    async revisionSurvivesPersist() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const memory = ctx.get(MemoryStore);
        try {
        const store = new TodoStore(memory as any);
        await store.replace('mig2', [item('a')]);
        let plan = await store.readPlan('mig2');
        expect(plan.revision).toBe(1);
        await store.merge('mig2', [item('b')]);
        plan = await store.readPlan('mig2');
        expect(plan.revision).toBe(2);
        expect(plan.todos.length).toBe(2);
        } finally { await ctx.close(); }
    }
}

@Suite('todo DAG scheduling (P205)')
export class TodoDagScheduleTest {

    @Test('empty list returns empty schedule')
    async emptyList() {
        const result = resolveSchedule([]);
        expect(result.all.length).toBe(0);
        expect(result.summary.total).toBe(0);
    }

    @Test('single item with no deps is ready')
    async singleItemReady() {
        const result = resolveSchedule([
            item('a', { status: 'pending' })
        ]);
        expect(result.ready.length).toBe(1);
        expect(result.ready[0].id).toBe('a');
        expect(result.blocked.length).toBe(0);
    }

    @Test('completed item shows as completed')
    async completedItem() {
        const result = resolveSchedule([
            item('a', { status: 'completed' })
        ]);
        expect(result.completed.length).toBe(1);
        expect(result.completed[0].id).toBe('a');
        expect(result.ready.length).toBe(0);
    }

    @Test('cancelled item shows as completed in schedule')
    async cancelledItemAsCompleted() {
        const result = resolveSchedule([
            item('a', { status: 'cancelled' })
        ]);
        expect(result.completed.length).toBe(1);
    }

    @Test('in_progress item shows as running')
    async inProgressAsRunning() {
        const result = resolveSchedule([
            item('a', { status: 'in_progress' })
        ]);
        expect(result.running.length).toBe(1);
        expect(result.running[0].id).toBe('a');
    }

    @Test('failed item shows as failed')
    async failedItem() {
        const result = resolveSchedule([
            item('a', { status: 'failed' })
        ]);
        expect(result.failed.length).toBe(1);
        expect(result.failed[0].id).toBe('a');
    }

    @Test('item blocked by incomplete dep')
    async blockedByIncompleteDep() {
        const result = resolveSchedule([
            item('a', { status: 'pending', dependsOn: ['b'] }),
            item('b', { status: 'pending' })
        ]);
        expect(result.blocked.length).toBe(1);
        expect(result.blocked[0].id).toBe('a');
        expect(result.blocked[0].blockedBy).toEqual(['b']);
        expect(result.ready.length).toBe(1);
        expect(result.ready[0].id).toBe('b');
    }

    @Test('item unblocked when dep completes')
    async unblockedWhenDepCompletes() {
        const result = resolveSchedule([
            item('a', { status: 'pending', dependsOn: ['b'] }),
            item('b', { status: 'completed' })
        ]);
        expect(result.ready.length).toBe(1);
        expect(result.ready[0].id).toBe('a');
        expect(result.blocked.length).toBe(0);
    }

    @Test('parallel branches with no cross-deps both ready')
    async parallelBranchesBothReady() {
        const result = resolveSchedule([
            item('a', { status: 'pending' }),
            item('b', { status: 'pending' }),
            item('c', { status: 'pending' })
        ]);
        expect(result.ready.length).toBe(3);
    }

    @Test('diamond dependency resolves correctly')
    async diamondDependency() {
        const result = resolveSchedule([
            item('a', { status: 'completed' }),
            item('b', { status: 'completed', dependsOn: ['a'] }),
            item('c', { status: 'completed', dependsOn: ['a'] }),
            item('d', { status: 'pending', dependsOn: ['b', 'c'] })
        ]);
        expect(result.ready.length).toBe(1);
        expect(result.ready[0].id).toBe('d');
    }

    @Test('failed item skips all transitive dependents')
    async failedSkipsTransitiveDependents() {
        const result = resolveSchedule([
            item('a', { status: 'failed' }),
            item('b', { status: 'pending', dependsOn: ['a'] }),
            item('c', { status: 'pending', dependsOn: ['b'] })
        ]);
        expect(result.failed.length).toBe(1);
        expect(result.failed[0].id).toBe('a');
        expect(result.skipped.length).toBe(2);
        const skippedIds = result.skipped.map(e => e.id);
        expect(skippedIds).toContain('b');
        expect(skippedIds).toContain('c');
    }

    @Test('partial failure preserves completed siblings')
    async partialFailurePreservesCompletedSiblings() {
        const result = resolveSchedule([
            item('a', { status: 'failed' }),
            item('b', { status: 'completed', dependsOn: ['a'] }),
            item('c', { status: 'pending', dependsOn: ['b'] })
        ]);
        expect(result.failed.length).toBe(1);
        expect(result.completed.length).toBe(1);
        expect(result.completed[0].id).toBe('b');
        expect(result.skipped.length).toBe(1);
        expect(result.skipped[0].id).toBe('c');
    }

    @Test('cancel is idempotent - already cancelled stays completed')
    async cancelIdempotent() {
        const result = resolveSchedule([
            item('a', { status: 'cancelled' }),
            item('b', { status: 'pending', dependsOn: ['a'] })
        ]);
        expect(result.completed.length).toBe(1);
        expect(result.ready.length).toBe(1);
        expect(result.ready[0].id).toBe('b');
    }

    @Test('TodoTool schedule action returns schedule without persisting')
    async todoToolScheduleAction() {
        const store = new TodoStore();
        const tool = new TodoTool(store);
        const result = await tool.invoke({
            action: 'schedule',
            todos: [
                { id: 'a', content: 'Step a', status: 'completed' },
                { id: 'b', content: 'Step b', status: 'pending', dependsOn: ['a'] }
            ]
        }, createSessionContext({ sessionId: 'sched1' }));
        expect(result.ready).toBeDefined();
        expect(result.ready.length).toBe(1);
        expect(result.ready[0].id).toBe('b');
        expect(result.completed.length).toBe(1);
        const persisted = await store.read('sched1');
        expect(persisted.length).toBe(0);
    }

    @Test('chain of dependencies resolves correct ready items')
    async chainDependency() {
        const result = resolveSchedule([
            item('a', { status: 'completed' }),
            item('b', { status: 'completed', dependsOn: ['a'] }),
            item('c', { status: 'pending', dependsOn: ['b'] }),
            item('d', { status: 'pending', dependsOn: ['c'] })
        ]);
        expect(result.ready.length).toBe(1);
        expect(result.ready[0].id).toBe('c');
        expect(result.blocked.length).toBe(1);
        expect(result.blocked[0].id).toBe('d');
        expect(result.blocked[0].blockedBy).toEqual(['c']);
    }
}
