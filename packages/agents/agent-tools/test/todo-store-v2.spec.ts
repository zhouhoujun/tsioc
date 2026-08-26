import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TodoStore, TodoItem, validateTodos, TodoValidationResult } from '../planning/todo-store';
import { TodoTool } from '../planning/todo.tool';

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
