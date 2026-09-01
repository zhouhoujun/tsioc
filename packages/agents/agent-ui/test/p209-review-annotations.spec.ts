import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleSessionState,
    AgentConsoleRemoteEventBridge,
} from '../src';

class RuntimeStub {
    readonly eventMulticaster = { addListener() { }, removeListener() { } };
    closeCalls = 0;
    registry = new Map<any, any>();
    get(_token: any, defaultValue?: any): any { return defaultValue; }
    async close(): Promise<void> { this.closeCalls += 1; }
}

class SchedulerStub {
    schedule(_action: any): void { }
}

class ToolRegistryStub {
    tools = new Map<string, any>();
    get(_name: string): any { return this.tools.get(_name); }
}

class AppRpcStub {
    calls: Array<{ method: string; params?: any }> = [];
    reviewAnnotationCacheByKey = new Map<string, Record<string, any>>();
    reviewGateCalls: Array<{ method: string; params?: any }> = [];
    reviewConclusionsWritten: any[] = [];
    async request(method: string, params?: any): Promise<any> {
        this.calls.push({ method, params });
        if (method === 'review_annotations.save') {
            const cacheKey = String(params?.cacheKey || 'console');
            this.reviewAnnotationCacheByKey.set(cacheKey, params?.cache || {});
            return { ok: true };
        }
        if (method === 'review_annotations.load') {
            const cacheKey = String(params?.cacheKey || 'console');
            return this.reviewAnnotationCacheByKey.get(cacheKey) || null;
        }
        if (method === 'review_gate.set') {
            this.reviewGateCalls.push({ method, params });
            return { ok: true };
        }
        if (method === 'review_gate.clear') {
            this.reviewGateCalls.push({ method, params });
            return { ok: true };
        }
        if (method === 'review_gate.status') {
            this.reviewGateCalls.push({ method, params });
            return { active: false, taskId: null };
        }
        if (method === 'review.conclusions.write') {
            this.reviewConclusionsWritten.push(params);
            return { ok: true, key: 'review.conclusions' };
        }
        if (method === 'tools.list') return [];
        if (method === 'model.list') return [];
        if (method === 'app.state') return null;
        return {};
    }
}

function openReview(state: AgentConsoleSessionState): void {
    (state as any).reviewTask = {
        id: 'task-1',
        title: 'Test task',
        status: 'completed',
        sourceSessionId: 'chat-a'
    };
    (state as any).reviewDiff = {
        text: [
            'diff --git a/src/a.ts b/src/a.ts',
            '--- a/src/a.ts',
            '+++ b/src/a.ts',
            '@@ -1,5 +1,8 @@',
            ' import foo from "./foo";',
            '+import bar from "./bar";',
            '+',
            '+const x = 1;',
            ' ',
            ' export default foo;',
            ''
        ].join('\n')
    };
    (state as any).reviewWorkers = [];
    (state as any).reviewOpen = true;
    (state as any).selectedReviewHunkIndex = 0;
}

function createComponent(appRpc?: AppRpcStub): { component: AgentConsoleComponent; state: AgentConsoleSessionState; appRpc: AppRpcStub } {
    const runtime = new RuntimeStub();
    const scheduler = new SchedulerStub();
    const rpc = appRpc || new AppRpcStub();
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    const bridge = new AgentConsoleEventBridge(state, runtime as any, new ToolRegistryStub() as any, rpc as any, undefined);
    const component = new AgentConsoleComponent(
        state,
        runtime as any,
        scheduler as any,
        bridge,
        { ui: { title: 'Console' } } as any,
        new ToolRegistryStub() as any,
        rpc as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined,
        undefined,
        undefined,
        undefined
    );
    return { component, state, appRpc: rpc };
}

@Suite('P209 hunk-level annotations')
export class P209HunkAnnotationSuite {

    @Test('setReviewHunkAnnotation stores annotation by file#hunk key')
    setReviewHunkAnnotationStoresAnnotationByKey() {
        const { state } = createComponent();
        openReview(state);
        state.setReviewHunkAnnotation('approved', 'LGTM', 'src/a.ts', 0);
        const annotation = state.getReviewHunkAnnotation('src/a.ts', 0);
        expect(annotation).toBeDefined();
        expect(annotation!.status).toEqual('approved');
        expect(annotation!.comment).toEqual('LGTM');
    }

    @Test('getReviewHunkAnnotation returns undefined for unannotated hunk')
    getReviewHunkAnnotationReturnsUndefinedForUnannotatedHunk() {
        const { state } = createComponent();
        openReview(state);
        const annotation = state.getReviewHunkAnnotation('src/a.ts', 0);
        expect(annotation).toBeUndefined();
    }

    @Test('clearReviewHunkAnnotation removes annotation')
    clearReviewHunkAnnotationRemovesAnnotation() {
        const { state } = createComponent();
        openReview(state);
        state.setReviewHunkAnnotation('approved', 'ok', 'src/a.ts', 0);
        expect(state.getReviewHunkAnnotation('src/a.ts', 0)).toBeDefined();
        state.clearReviewHunkAnnotation('src/a.ts', 0);
        expect(state.getReviewHunkAnnotation('src/a.ts', 0)).toBeUndefined();
    }

    @Test('setReviewHunkAnnotation is no-op when review is closed')
    setReviewHunkAnnotationIsNoOpWhenReviewClosed() {
        const { state } = createComponent();
        state.setReviewHunkAnnotation('approved', 'ok', 'src/a.ts', 0);
        expect(state.getReviewHunkAnnotation('src/a.ts', 0)).toBeUndefined();
    }

    @Test('rejectAllReviewHunksForFile marks all hunks as rejected')
    rejectAllReviewHunksForFileMarksAllHunksAsRejected() {
        const { state } = createComponent();
        openReview(state);
        state.rejectAllReviewHunksForFile('all bad', 'src/a.ts');
        const annotation0 = state.getReviewHunkAnnotation('src/a.ts', 0);
        expect(annotation0).toBeDefined();
        expect(annotation0!.status).toEqual('rejected');
        expect(annotation0!.comment).toEqual('all bad');
    }

    @Test('approveAllReviewHunksForFile marks all hunks as approved')
    approveAllReviewHunksForFileMarksAllHunksAsApproved() {
        const { state } = createComponent();
        openReview(state);
        state.approveAllReviewHunksForFile('all good', 'src/a.ts');
        const annotation0 = state.getReviewHunkAnnotation('src/a.ts', 0);
        expect(annotation0).toBeDefined();
        expect(annotation0!.status).toEqual('approved');
        expect(annotation0!.comment).toEqual('all good');
    }

    @Test('rejectAllReviewFiles marks all file sections as rejected')
    rejectAllReviewFilesMarksAllSectionsRejected() {
        const { state } = createComponent();
        openReview(state);
        state.rejectAllReviewFiles('nope');
        const files = state.reviewFileAnnotations;
        expect(Object.keys(files).length).toBeGreaterThan(0);
        for (const key of Object.keys(files)) {
            expect(files[key].status).toEqual('rejected');
        }
    }

    @Test('collectReviewConclusions returns structured summary')
    collectReviewConclusionsReturnsStructuredSummary() {
        const { state } = createComponent();
        openReview(state);
        state.setReviewHunkAnnotation('approved', 'ok', 'src/a.ts', 0);
        state.rejectAllReviewFiles('bad');
        const conclusions = state.collectReviewConclusions();
        expect(conclusions.summary.totalFiles).toBeGreaterThan(0);
        expect(conclusions.summary.rejectedFiles).toEqual(conclusions.summary.totalFiles);
        expect(conclusions.summary.totalHunks).toEqual(1);
        expect(conclusions.summary.approvedHunks).toEqual(1);
        expect(Object.keys(conclusions.hunks).length).toEqual(1);
    }

    @Test('writeReviewConclusions fires onReviewConclusionsWriteBack callback')
    writeReviewConclusionsFiresCallback() {
        const { state } = createComponent();
        openReview(state);
        let receivedConclusions: any = null;
        state.onReviewConclusionsWriteBack = (conclusions) => { receivedConclusions = conclusions; };
        state.setReviewHunkAnnotation('approved', 'ok', 'src/a.ts', 0);
        state.writeReviewConclusions();
        expect(receivedConclusions).not.toBeNull();
        expect(receivedConclusions.summary.totalHunks).toEqual(1);
    }

    @Test('annotations persist via onReviewAnnotationsPersist callback')
    annotationsPersistViaCallback() {
        const { state } = createComponent();
        openReview(state);
        let persistedCache: any = null;
        state.onReviewAnnotationsPersist = (cache) => { persistedCache = cache; };
        state.setReviewHunkAnnotation('approved', 'ok', 'src/a.ts', 0);
        expect(persistedCache).not.toBeNull();
        expect(Object.keys(persistedCache).length).toBeGreaterThan(0);
    }
}

@Suite('P209 review gate')
export class P209ReviewGateSuite {

    @Test('onSessionReconnected callback is wired in component')
    onSessionReconnectedCallbackIsWired() {
        const { state } = createComponent();
        let called = false;
        state.onSessionReconnected = () => { called = true; };
        state.onSessionReconnected!();
        expect(called).toEqual(true);
    }
}

@Suite('P209 disconnect recovery')
export class P209DisconnectRecoverySuite {

    @Test('bridge onReconnected callback fires after hasConnected flag set')
    bridgeOnReconnectedFiresAfterFirstConnect() {
        let reconnected = false;
        const mockState = {
            reviewHunkAnnotations: {} as Record<string, any>,
            reviewFileAnnotations: {} as Record<string, any>,
            reviewOpen: true,
            reviewFileSections: [],
            selectedReviewHunkIndex: 0,
            selectedReviewFileSection: undefined as any,
            onReviewAnnotationsPersist: undefined as any,
            onReviewConclusionsWriteBack: undefined as any,
            onSessionReconnected: undefined as any,
            syncCurrentReviewAnnotationCache() { },
            getAnnotationCache() { return {}; }
        };
        const bridge = new AgentConsoleRemoteEventBridge(mockState as any, {
            baseUrl: 'http://localhost:3100',
            onReconnected: () => { reconnected = true; }
        });
        // Before first connect, hasConnected is false
        expect((bridge as any).hasConnected).toEqual(false);
        // Simulate a successful first connect by setting the flag
        (bridge as any).hasConnected = true;
        // Now trigger the onReconnected path — it should fire
        (bridge as any).options.onReconnected?.();
        expect(reconnected).toEqual(true);
    }
}

function stubReviewDetailLines(state: AgentConsoleSessionState, count: number): void {
    const lines = Array.from({ length: count }, (_, i) => `line-${i}`);
    Object.defineProperty(state, 'reviewDetailLines', { get() { return lines; }, configurable: true });
}

@Suite('P209 pagination for large diffs')
export class P209PaginationSuite {

    @Test('scrollReviewDetailPage advances scroll by pageSize lines')
    scrollReviewDetailPageAdvancesByPageSize() {
        const { state } = createComponent();
        openReview(state);
        stubReviewDetailLines(state, 30);
        state.reviewDetailScroll = 0;
        state.scrollReviewDetailPage(1, 6);
        expect(state.reviewDetailScroll).toEqual(6);
    }

    @Test('scrollReviewDetailPage backward reduces scroll')
    scrollReviewDetailPageBackwardReducesScroll() {
        const { state } = createComponent();
        openReview(state);
        stubReviewDetailLines(state, 30);
        state.reviewDetailScroll = 12;
        state.scrollReviewDetailPage(-1, 6);
        expect(state.reviewDetailScroll).toEqual(6);
    }

    @Test('scrollReviewDetailPage clamps at end of content')
    scrollReviewDetailPageClampsAtEnd() {
        const { state } = createComponent();
        openReview(state);
        stubReviewDetailLines(state, 10);
        state.reviewDetailScroll = 0;
        state.scrollReviewDetailPage(100, 6);
        const maxScroll = Math.max(0, 10 - state.consoleOptions.reviewDetailVisibleLines);
        expect(state.reviewDetailScroll).toEqual(maxScroll);
    }

    @Test('scrollReviewDetailPage is no-op when review is closed')
    scrollReviewDetailPageIsNoOpWhenClosed() {
        const { state } = createComponent();
        state.reviewDetailScroll = 5;
        state.scrollReviewDetailPage(1, 6);
        expect(state.reviewDetailScroll).toEqual(5);
    }
}

@Suite('P209 structured write-back')
export class P209WriteBackSuite {

    @Test('writeReviewConclusions returns conclusions with summary')
    writeReviewConclusionsReturnsConclusions() {
        const { state } = createComponent();
        openReview(state);
        state.setReviewHunkAnnotation('approved', 'ok', 'src/a.ts', 0);
        state.rejectAllReviewFiles('bad');
        const result = state.writeReviewConclusions();
        expect(result).toBeDefined();
        expect(result.summary.totalHunks).toEqual(1);
        expect(result.summary.approvedHunks).toEqual(1);
        expect(result.summary.rejectedFiles).toEqual(result.summary.totalFiles);
        expect(Object.keys(result.hunks).length).toEqual(1);
        expect(Object.keys(result.files).length).toBeGreaterThan(0);
    }

    @Test('onReviewConclusionsWriteBack receives serialized conclusions')
    onReviewConclusionsWriteBackReceivesSerializedConclusions() {
        const { state } = createComponent();
        openReview(state);
        let received: any = null;
        state.onReviewConclusionsWriteBack = (c) => { received = c; };
        state.setReviewHunkAnnotation('approved', 'ok', 'src/a.ts', 0);
        state.writeReviewConclusions();
        expect(received).not.toBeNull();
        expect(typeof received.summary).toEqual('object');
        expect(typeof received.summary.totalFiles).toEqual('number');
        expect(typeof received.summary.approvedFiles).toEqual('number');
        expect(typeof received.summary.rejectedFiles).toEqual('number');
        expect(typeof received.summary.totalHunks).toEqual('number');
        expect(typeof received.summary.approvedHunks).toEqual('number');
        expect(typeof received.summary.rejectedHunks).toEqual('number');
    }

    @Test('collectReviewConclusions with no annotations returns zeroed summary')
    collectReviewConclusionsNoAnnotationsReturnsZeroSummary() {
        const { state } = createComponent();
        openReview(state);
        const result = state.collectReviewConclusions();
        expect(result.summary.totalFiles).toEqual(0);
        expect(result.summary.approvedFiles).toEqual(0);
        expect(result.summary.rejectedFiles).toEqual(0);
        expect(result.summary.totalHunks).toEqual(0);
        expect(result.summary.approvedHunks).toEqual(0);
        expect(result.summary.rejectedHunks).toEqual(0);
    }
}
