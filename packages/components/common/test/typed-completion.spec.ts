import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    collectTypedPaths,
    createTypedPathCompletion,
    filterTypedPaths,
    normalizeTypedCompletion,
    typedPathsFromSuggestions,
    TypedCompletionController
} from '../dynamic-form';

async function flush(): Promise<void> {
    for (let index = 0; index < 4; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

@Suite('common typed completion')
export class TypedCompletionTest {
    @Test('converts host suggestions into per-source paths')
    pathsFromSuggestions() {
        const suggestions = ['msg.payload', 'msg.payload.id', 'flow.count', 'context.variables.x', 'msg'];
        expect(typedPathsFromSuggestions(suggestions, 'msg')).toEqual(['payload', 'payload.id']);
        expect(typedPathsFromSuggestions(suggestions, 'flow')).toEqual(['count']);
        expect(typedPathsFromSuggestions(undefined, 'msg')).toEqual([]);
    }

    @Test('collects bounded, cycle-safe paths from a runtime scope')
    collectPaths() {
        const scope: any = {
            payload: { id: 1, nested: { deep: 2 } },
            topic: 'demo',
            handler: () => undefined
        };
        scope.payload.self = scope;
        const paths = collectTypedPaths(scope, ['payload', 'topic'], 2);
        expect(paths).toContain('payload');
        expect(paths).toContain('topic');
        expect(paths).toContain('payload.id');
        expect(paths).toContain('payload.nested');
        expect(paths).toContain('payload.nested.deep');
        expect(paths).not.toContain('handler');
        // The cycle is visited once, not expanded into `self.self...`.
        expect(paths.filter(path => path.startsWith('payload.self')).length).toBeLessThan(3);
    }

    @Test('filters paths by prefix and honours the limit')
    filterPaths() {
        const paths = ['payload', 'payload.id', 'payload.name', 'topic'];
        expect(filterTypedPaths(paths, 'pay')).toEqual(['payload', 'payload.id', 'payload.name']);
        expect(filterTypedPaths(paths, 'PAYLOAD.N')).toEqual(['payload.name']);
        expect(filterTypedPaths(paths, '')).toEqual(paths);
        expect(filterTypedPaths(paths, '', 2)).toEqual(['payload', 'payload.id']);
        expect(createTypedPathCompletion(['flow.count'])('flo')).toEqual([{ label: 'flow.count', value: 'flow.count' }]);
    }

    @Test('normalizes host completion results')
    normalize() {
        expect(normalizeTypedCompletion(undefined)).toEqual([]);
        expect(normalizeTypedCompletion([{ label: 'A', value: 'a' }])).toEqual([{ label: 'A', value: 'a' }]);
        expect(normalizeTypedCompletion({ items: [{ label: '', value: 'b', description: 'B' }], total: 1 }))
            .toEqual([{ label: 'b', value: 'b', description: 'B' }]);
        expect(normalizeTypedCompletion([{ label: 'x', value: undefined as any }])).toEqual([]);
    }

    @Test('discards stale typed completion responses')
    async staleResponses() {
        let releaseFirst!: (items: any[]) => void;
        const source = {
            completionSource: (query: string) => query === 'slow'
                ? new Promise<any[]>(resolve => { releaseFirst = resolve; })
                : [{ label: 'fast', value: 'fast' }]
        };
        const controller = new TypedCompletionController();
        const slow = controller.query(source, 'slow');
        const fast = await controller.query(source, 'fast');
        expect(fast).toEqual([{ label: 'fast', value: 'fast' }]);
        releaseFirst([{ label: 'stale', value: 'stale' }]);
        expect(await slow).toEqual([]);
    }

    @Test('aborts the previous typed completion request')
    async abortPrevious() {
        let firstSignal: AbortSignal | undefined;
        const source = {
            completionSource: (query: string, signal?: AbortSignal) => {
                if (!firstSignal) {
                    firstSignal = signal;
                    return new Promise<any[]>(resolve => {
                        signal?.addEventListener('abort', () => resolve([]));
                    });
                }
                return [{ label: 'second', value: 'second' }];
            }
        };
        const controller = new TypedCompletionController();
        const first = controller.query(source, 'one');
        await flush();
        expect(await controller.query(source, 'two')).toEqual([{ label: 'second', value: 'second' }]);
        expect(firstSignal?.aborted).toBe(true);
        expect(await first).toEqual([]);
        controller.dispose();
    }
}
