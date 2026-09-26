import expect = require('expect');
import { Buffer } from 'buffer';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createReadStream } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { AudioCaptureAdapter, AudioCaptureSessionEvents, AudioPlaybackAdapter, AudioPlaybackOptions, Encodings, FileAdapter, FileDirectoryEntry, IReadable } from '@tsdi/common';
import {
    AgentApprovalCompletedEvent,
    AgentApprovalFailedEvent,
    AgentApprovalRequestedEvent,
    AgentCompensationEvent,
    MemoryStore,
    AgentModelCompletedEvent,
    AgentStreamChunkEvent,
    AgentToolCompletedEvent,
    AgentToolFailedEvent,
    AgentToolInvokedEvent,
    InMemoryCommandExecutionControl,
    normalizeAgentWorkspaceIdentity
} from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleInputHistoryStore,
    AgentConsoleInputPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleApprovalRequest,
    AgentConsoleSessionService,
    AgentConsoleSessionState,
    AgentConsoleSessionChoice,
    AgentConsoleSessionProjectGroup,
    AgentConsoleWorkspaceMentionsProvider,
    AgentConsoleKeymap,
    AgentConsoleKeymapStore,
    AgentConsoleSettingsStore,
    AgentConsoleThemeStore,
    agentConsoleThemes,
    AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP,
    AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP,
    reduceAgentConsoleCommandExecution,
    createBeginCommandExecutionAction,
    createCompleteCommandExecutionAction,
    createFailCommandExecutionAction,
    createLinkCommandOutputAction,
    AgentConsoleCommandExecution
} from '../src';
import { runAgentUiOrmApp } from '../testing/agent-orm';
import {TestFileAdapter, AudioCaptureStub, AudioPlaybackStub, RuntimeStub, FailingRuntimeStub, SchedulerStub, ToolRegistryStub, EventMulticasterStub, ApplicationContextStub, AppRpcStub, SessionServiceStub, createDeferred, createConsole, createConsoleParts, waitForCondition} from './_helpers';

@Suite('Agent console diagnostics/quality/usage/compaction')
export class VmDiagnosticsTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('submit renders rpc stream events as compact timeline messages')
    async submitRendersRpcStreamEventsAsSeparateTimelineMessages() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.streamChunks = [
            { type: 'event', eventType: 'turn_started', label: 'state', status: 'running', content: 'Analyzing request' },
            { type: 'event', eventType: 'tool_invoked', label: 'tool', status: 'running', toolName: 'read_file', toolCallId: 'c1', content: 'read_file · src/index.ts' },
            { type: 'event', eventType: 'tool_completed', label: 'tool', status: 'success', toolName: 'read_file', toolCallId: 'c1', content: 'read_file · src/index.ts' },
            { type: 'text', content: 'Patched handler' },
            {
                type: 'done',
                message: {
                    id: 'done-1',
                    role: 'assistant',
                    content: 'Patched handler',
                    createdAt: 2,
                    metadata: {
                        usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 }
                    }
                }
            }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = 'fix it';
        await component.submit();

        const eventMessages = component.sessionState.displayMessages.filter(message => message.metadata?.uiKind === 'event');
        expect(eventMessages.map(message => message.content)).toEqual([
            'read file completed · src/index.ts'
        ]);
        expect(component.sessionState.displayMessages.some(message => message.content === 'Patched handler')).toEqual(true);
    }

    @Test('submit surfaces context prepared and turn diagnostics rpc stream events')
    async submitSurfacesContextPreparedAndTurnDiagnosticsStreamEvents() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.streamChunks = [
            { type: 'event', eventType: 'turn_started', label: 'state', status: 'running', content: 'Analyzing request' },
            {
                type: 'event',
                eventType: 'context_prepared',
                label: 'model',
                status: 'success',
                content: 'Context pruned: 8000→5000 tokens (38% saved)',
                report: {
                    strategy: 'pruned',
                    beforeTokens: 8000,
                    afterTokens: 5000,
                    compressionRatio: 38
                }
            },
            {
                type: 'event',
                eventType: 'turn_diagnostics',
                label: 'state',
                status: 'success',
                content: 'Turn diagnostics: 1 compaction, 3000 tokens saved',
                diagnostics: {
                    compactionCount: 1,
                    totalTokenSavings: 3000,
                    promptCache: {
                        requested: { enabled: true, strategy: 'auto', scopes: ['system', 'summary', 'memory'] },
                        provider: 'anthropic',
                        supported: 'partial',
                        applied: true,
                        appliedStrategy: 'ephemeral',
                        appliedScopes: ['system'],
                        observedCachedPromptTokens: 512,
                        observedCreatedPromptTokens: 128
                    }
                }
            },
            { type: 'text', content: 'Patched handler' },
            {
                type: 'done',
                message: {
                    id: 'done-1',
                    role: 'assistant',
                    content: 'Patched handler',
                    createdAt: 2,
                    metadata: { usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }
                }
            }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = 'fix it';
        await component.submit();

        expect(component.sessionState.contextPreparationSummary).toContain('pruned');
        expect(component.sessionState.contextPreparationSummary).toContain('8000');
        expect(component.activities.some(activity =>
            activity.kind === 'model' && activity.message.includes('Context pruned: 8000→5000')
        )).toEqual(true);
        expect(component.activities.some(activity =>
            activity.message.includes('1 compaction') && activity.message.includes('3000 tokens saved')
        )).toEqual(true);
        expect(component.activities.some(activity =>
            activity.message.includes('prompt cache partial (applied, 512 cached tokens)')
        )).toEqual(true);
    }

    @Test('quality command shows summary quality aggregates through rpc')
    async qualityCommandShowsAggregatesThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityAggregates = [{
            provider: 'deepseek',
            recordCount: 12,
            avgTotal: 84.2,
            minTotal: 60,
            maxTotal: 98,
            avgFieldCompleteness: 92,
            avgAnnotationQuality: 80,
            avgLengthBalance: 90,
            avgTruncationScore: 88,
            fallbackRate: 8.3,
            avgEvidenceCoverage: 67.5,
            timeRange: { from: 1720000000000, to: 1720086400000 }
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality deepseek';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'summary_quality.stats' && call.params?.provider === 'deepseek')).toEqual(true);
        expect(component.notice).toContain('deepseek');
        expect(component.notice).toContain('12');
        expect(component.notice).toContain('evidence 67.5%');
    }

    @Test('usage command shows token and turn aggregates through rpc')
    async usageCommandShowsAggregatesThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.usageStats = {
            daily: { turns: 2, promptTokens: 12, completionTokens: 8, totalTokens: 20 },
            weekly: { turns: 7, promptTokens: 40, completionTokens: 30, totalTokens: 70 },
            cumulative: { turns: 9, promptTokens: 52, completionTokens: 38, totalTokens: 90 }
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/usage session-1';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'usage.stats' && call.params?.sessionId === 'session-1')).toEqual(true);
        expect(component.notice).toContain('day 2 turns');
        expect(component.notice).toContain('week 7 turns');
        expect(component.notice).toContain('all 9 turns');
        expect(component.notice).toContain('90 total');
    }

    @Test('usage command selects a period and forwards since')
    async usageCommandSelectsPeriodAndSince() {
        const appRpc = new AppRpcStub();
        appRpc.usageStats = {
            daily: { turns: 1, totalTokens: 10 },
            weekly: { turns: 3, totalTokens: 30 },
            cumulative: { turns: 5, promptTokens: 20, completionTokens: 20, totalTokens: 40 }
        };
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        component.input = '/usage cumulative session-1 2026-08-01';
        await component.submit();
        const call = appRpc.calls.find(item => item.method === 'usage.stats' && item.params?.range === 'cumulative');
        expect(call?.params).toEqual({ sessionId: 'session-1', range: 'cumulative', since: '2026-08-01' });
        expect(component.notice).toContain('all 5 turns');
        expect(component.notice).not.toContain('day 1 turns');
    }

    @Test('quality command reports empty stats when nothing recorded')
    async qualityCommandReportsEmptyStats() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityAggregates = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'summary_quality.stats' && !call.params?.provider)).toEqual(true);
        expect(component.notice).toContain('No summary quality stats');
    }

    @Test('quality list command opens record selector through rpc')
    async qualityListCommandOpensRecordSelector() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityRecords = [{
            id: 'sq-rec-1',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            total: 92,
            fieldCompleteness: 100,
            annotationQuality: 100,
            lengthBalance: 100,
            truncationScore: 100,
            fallbackUsed: false,
            evidenceCoverage: 88.5,
            summaryLength: 230,
            createdAt: 1720000000000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality list deepseek';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(appRpc.calls.some(call => call.method === 'summary_quality.list' && call.params?.provider === 'deepseek' && call.params?.limit === 200)).toEqual(true);
        expect(component.sessionState.selectMenu?.title).toEqual('Summary quality records (deepseek)');
        expect(component.sessionState.selectMenu?.options[0].label).toContain('deepseek-v4-flash');
        expect(component.sessionState.selectMenu?.options[0].label).toContain('92');
        expect(component.sessionState.selectMenu?.options[0].description).toContain('evidence 88.5%');

        await component.sessionState.cancelSelectMenu();
        await pending;
    }

    @Test('quality list command reports empty records')
    async qualityListCommandReportsEmptyRecords() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityRecords = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality list';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'summary_quality.list' && !call.params?.provider)).toEqual(true);
        expect(component.notice).toContain('No summary quality records');
    }

    @Test('quality aggregates join multiple providers into a single notice')
    async qualityAggregatesJoinMultipleProviders() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityAggregates = [
            { provider: 'deepseek', recordCount: 12, avgTotal: 84.2, fallbackRate: 8.3, avgEvidenceCoverage: 70, timeRange: {} },
            { provider: 'anthropic', recordCount: 3, avgTotal: 71, fallbackRate: 33.3, avgEvidenceCoverage: 55, timeRange: {} }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality';
        await component.submit();

        expect(component.notice).toContain('deepseek');
        expect(component.notice).toContain('anthropic');
        expect(component.notice).toContain('evidence');
    }

    @Test('quality trend command renders sparkline through rpc')
    async qualityTrendCommandRendersSparkline() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const day = 24 * 60 * 60 * 1000;
        appRpc.summaryQualityTrend = [
            { provider: 'deepseek', bucketStart: 0, recordCount: 2, avgTotal: 75, minTotal: 60, maxTotal: 90, fallbackRate: 50, avgEvidenceCoverage: 40 },
            { provider: 'deepseek', bucketStart: day, recordCount: 1, avgTotal: 90, minTotal: 90, maxTotal: 90, fallbackRate: 0, avgEvidenceCoverage: 100 }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality trend deepseek';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'summary_quality.trend' && call.params?.provider === 'deepseek')).toEqual(true);
        expect(component.notice).toContain('deepseek');
        expect(component.notice).toContain('▇');
        expect(component.notice).toContain('█');
        expect(component.notice).toContain('avg 82.5');
        expect(component.notice).toContain('evidence 70.0%');
    }

    @Test('quality trend command reports empty trend')
    async qualityTrendCommandReportsEmptyTrend() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityTrend = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality trend';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'summary_quality.trend' && !call.params?.provider)).toEqual(true);
        expect(component.notice).toContain('No summary quality trend');
    }

    @Test('quality trend command forwards bucket size and max buckets through rpc')
    async qualityTrendCommandForwardsBucketParams() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityTrend = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality trend deepseek 7d 60';
        await component.submit();

        const call = appRpc.calls.find(call => call.method === 'summary_quality.trend');
        expect(call).toBeTruthy();
        expect(call!.params?.provider).toEqual('deepseek');
        expect(call!.params?.bucketSize).toEqual(7 * 24 * 60 * 60 * 1000);
        expect(call!.params?.maxBuckets).toEqual(60);
    }

    @Test('quality trend command accepts millisecond bucket size')
    async qualityTrendCommandAcceptsMillisecondBucketSize() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityTrend = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality trend anthropic 3600000';
        await component.submit();

        const call = appRpc.calls.find(call => call.method === 'summary_quality.trend');
        expect(call).toBeTruthy();
        expect(call!.params?.provider).toEqual('anthropic');
        expect(call!.params?.bucketSize).toEqual(3600000);
        expect(call!.params?.maxBuckets).toBeUndefined();
    }

    @Test('quality trend command ignores invalid numeric tokens')
    async qualityTrendCommandIgnoresInvalidTokens() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityTrend = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/quality trend deepseek 0d abc';
        await component.submit();

        const call = appRpc.calls.find(call => call.method === 'summary_quality.trend');
        expect(call).toBeTruthy();
        expect(call!.params?.provider).toEqual('deepseek');
        expect(call!.params?.bucketSize).toBeUndefined();
        expect(call!.params?.maxBuckets).toBeUndefined();
    }

    @Test('compactions command lists compaction history for current session')
    async compactionsCommandListsHistory() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.compactionHistoryRecords = [{
            id: 'c1',
            sessionId: 'session-1',
            strategy: 'compacted',
            compactionTriggered: true,
            level: 'light',
            summaryInserted: true,
            beforeMessageCount: 20,
            afterMessageCount: 10,
            beforeTokens: 8000,
            afterTokens: 4000,
            compactedMessageCount: 10,
            preservedAnchorCount: 2,
            recentMessageCount: 4,
            prunedMessageCount: 0,
            toolMessagesCompacted: 0,
            compressionRatio: 50,
            cumulativeTokenSavings: 4000,
            replayed: false,
            createdAt: 1
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/compactions session-1';
        await component.submit();

        const call = appRpc.calls.find(call => call.method === 'compaction_history.list');
        expect(call).toBeTruthy();
        expect(call!.params?.sessionId).toEqual('session-1');
        expect(component.notice).toContain('compacted');
        expect(component.notice).toContain('20→10 msgs');
        expect(component.notice).toContain('tokens');
        expect(component.notice).toContain('50%');
    }

    @Test('compactions command reports empty history')
    async compactionsCommandReportsEmptyHistory() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.compactionHistoryRecords = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/compactions session-1';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'compaction_history.list')).toEqual(true);
        expect(component.notice).toContain('No compaction history');
    }

    @Test('refresh turn artifacts loads summary quality digest through rpc')
    async refreshTurnArtifactsLoadsSummaryQualityDigest() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityAggregates = [{
            provider: 'deepseek',
            recordCount: 12,
            avgTotal: 84.2,
            fallbackRate: 8.3,
            timeRange: { from: 1720000000000, to: 1720086400000 }
        }, {
            provider: 'anthropic',
            recordCount: 3,
            avgTotal: 71,
            fallbackRate: 33.3,
            timeRange: {}
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        expect(appRpc.calls.some(call => call.method === 'summary_quality.stats' && !call.params?.provider)).toEqual(true);
        expect(component.sessionState.summaryQualityDigest).toContain('deepseek');
        expect(component.sessionState.summaryQualityDigest).toContain('avg 84.2');
        expect(component.sessionState.summaryQualityDigest).toContain('anthropic');
    }

    @Test('refresh turn artifacts loads usage digest through rpc')
    async refreshTurnArtifactsLoadsUsageDigest() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.usageStats = {
            daily: { turns: 1, promptTokens: 5, completionTokens: 4, totalTokens: 9 },
            weekly: { turns: 3, promptTokens: 12, completionTokens: 11, totalTokens: 23 },
            cumulative: { turns: 4, promptTokens: 17, completionTokens: 15, totalTokens: 32 }
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        expect(appRpc.calls.some(call => call.method === 'usage.stats' && !call.params?.sessionId)).toEqual(true);
        expect(component.sessionState.usageDigest).toContain('day 1 turns');
        expect(component.sessionState.usageDigest).toContain('week 3 turns');
        expect(component.sessionState.usageDigest).toContain('all 4 turns');
    }

    @Test('refresh turn artifacts clears usage digest when nothing recorded')
    async refreshTurnArtifactsClearsUsageDigestWhenEmpty() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.usageStats = { daily: {}, weekly: {}, cumulative: {} };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        component.sessionState.setUsageDigest('stale digest');

        await (component as any).refreshTurnArtifacts();

        expect(appRpc.calls.some(call => call.method === 'usage.stats')).toEqual(true);
        expect(component.sessionState.usageDigest).toBe('');
    }

    @Test('refresh turn artifacts clears summary quality digest when nothing recorded')
    async refreshTurnArtifactsClearsSummaryQualityDigestWhenEmpty() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.summaryQualityAggregates = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        component.sessionState.setSummaryQualityDigest('stale digest');

        await (component as any).refreshTurnArtifacts();

        expect(appRpc.calls.some(call => call.method === 'summary_quality.stats')).toEqual(true);
        expect(component.sessionState.summaryQualityDigest).toBe('');
    }

    @Test('refresh turn artifacts loads compaction digest through rpc')
    async refreshTurnArtifactsLoadsCompactionDigest() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.compactionHistoryAggregates = [{
            sessionId: 'session-1',
            recordCount: 2,
            compactedCount: 2,
            prunedCount: 0,
            avgCompressionRatio: 62.5,
            totalTokensBefore: 20000,
            totalTokensAfter: 7500,
            totalTokensSaved: 12500,
            timeRange: { from: 1720000000000, to: 1720086400000 }
        }, {
            sessionId: 'session-2',
            recordCount: 1,
            compactedCount: 1,
            prunedCount: 0,
            avgCompressionRatio: 50,
            totalTokensBefore: 8000,
            totalTokensAfter: 4000,
            totalTokensSaved: 4000,
            timeRange: {}
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        expect(appRpc.calls.some(call => call.method === 'compaction_history.stats' && !call.params?.sessionId)).toEqual(true);
        expect(component.sessionState.compactionDigest).toContain('session-1');
        expect(component.sessionState.compactionDigest).toContain('2 compactions');
        expect(component.sessionState.compactionDigest).toContain('saved 12.5K tokens');
        expect(component.sessionState.compactionDigest).toContain('session-2');
    }

    @Test('refresh turn artifacts clears compaction digest when nothing recorded')
    async refreshTurnArtifactsClearsCompactionDigestWhenEmpty() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.compactionHistoryAggregates = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        component.sessionState.setCompactionDigest('stale digest');

        await (component as any).refreshTurnArtifacts();

        expect(appRpc.calls.some(call => call.method === 'compaction_history.stats')).toEqual(true);
        expect(component.sessionState.compactionDigest).toBe('');
    }

    @Test('refresh turn artifacts loads turn diagnostics digest through rpc')
    async refreshTurnArtifactsLoadsTurnDiagnosticsDigest() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.turnDiagnosticsAggregate = {
            sessionIds: ['session-1'],
            totalTurns: 12,
            emptyResponseCount: 1,
            emptyResponseRate: 8.3,
            repeatedClarificationCount: 2,
            repeatedQuestionRate: 16.7,
            finalClarificationCount: 0,
            clarificationRate: 0,
            followUpRecoveryCount: 2,
            followUpRecoveryRate: 16.7,
            compactionCount: 3,
            totalTokenSavings: 25000,
            timeRange: { from: 0, to: 172800000 }
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        expect(appRpc.calls.some(call => call.method === 'turn_diagnostics.stats' && !call.params?.sessionId)).toEqual(true);
        expect(component.sessionState.turnDiagnosticsDigest).toContain('12 turns');
        expect(component.sessionState.turnDiagnosticsDigest).toContain('empty 8.3%');
        expect(component.sessionState.turnDiagnosticsDigest).toContain('3 compact(s)');
        expect(component.sessionState.turnDiagnosticsDigest).toContain('saved 25K tokens');
    }

    @Test('refresh turn artifacts clears turn diagnostics digest when nothing recorded')
    async refreshTurnArtifactsClearsTurnDiagnosticsDigestWhenEmpty() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.turnDiagnosticsAggregate = null;
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        component.sessionState.setTurnDiagnosticsDigest('stale digest');

        await (component as any).refreshTurnArtifacts();

        expect(appRpc.calls.some(call => call.method === 'turn_diagnostics.stats')).toEqual(true);
        expect(component.sessionState.turnDiagnosticsDigest).toBe('');
    }

    @Test('compactions trend command renders per-session sparkline through rpc')
    async compactionsTrendCommandShowsSparkline() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const day = 24 * 60 * 60 * 1000;
        appRpc.compactionHistoryTrend = [
            { sessionId: 'session-1', bucketStart: 0, recordCount: 1, compactedCount: 1, prunedCount: 0, avgCompressionRatio: 50, totalTokensBefore: 8000, totalTokensAfter: 4000, totalTokensSaved: 4000 },
            { sessionId: 'session-1', bucketStart: day, recordCount: 1, compactedCount: 1, prunedCount: 0, avgCompressionRatio: 75, totalTokensBefore: 4000, totalTokensAfter: 1000, totalTokensSaved: 3000 },
            { sessionId: 'session-2', bucketStart: 0, recordCount: 1, compactedCount: 1, prunedCount: 0, avgCompressionRatio: 25, totalTokensBefore: 2000, totalTokensAfter: 1500, totalTokensSaved: 500 }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/compactions trend';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'compaction_history.trend' && !call.params?.sessionId)).toEqual(true);
        expect(component.notice).toContain('session-1');
        expect(component.notice).toContain('▅▇');
        expect(component.notice).toContain('saved 7K tokens');
        expect(component.notice).toContain('avg 62.5%');
        expect(component.notice).toContain('session-2');
        expect(component.notice).toContain('saved 500 tokens');
    }

    @Test('compactions trend command passes session and bucket options through rpc')
    async compactionsTrendCommandPassesOptions() {
        const day = 24 * 60 * 60 * 1000;
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.compactionHistoryTrend = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/compactions trend session-1 2d 10';
        await component.submit();

        const trendCall = appRpc.calls.find(call => call.method === 'compaction_history.trend');
        expect(trendCall).toBeTruthy();
        expect(trendCall!.params.sessionId).toEqual('session-1');
        expect(trendCall!.params.bucketSize).toEqual(2 * day);
        expect(trendCall!.params.maxBuckets).toEqual(10);
        expect(component.notice).toContain("No compaction history trend recorded for session 'session-1'.");
    }

    @Test('compactions trend command reports empty trend when nothing recorded')
    async compactionsTrendCommandReportsEmpty() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.compactionHistoryTrend = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/compactions trend';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'compaction_history.trend')).toEqual(true);
        expect(component.notice).toContain('No compaction history trend recorded yet.');
    }

    @Test('compact command forces compaction through rpc and notifies summary')
    async compactCommandForcesCompaction() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/compact trim the session';
        await component.submit();

        const call = appRpc.calls.find(call => call.method === 'session.compact');
        expect(call).toBeTruthy();
        expect(call!.params?.sessionId).toEqual('console');
        expect(call!.params?.reason).toEqual('trim the session');
        expect(component.notice).toContain('Compacted');
        expect(component.notice).toContain('20');
        expect(component.notice).toContain('10');
        expect(component.notice).toContain('50%');
    }

    @Test('compact command reports nothing to compact when history unchanged')
    async compactCommandReportsUnchanged() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.compactResult = { sessionId: 'console', compacted: false, strategy: 'unchanged' };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/compact';
        await component.submit();

        const call = appRpc.calls.find(call => call.method === 'session.compact');
        expect(call).toBeTruthy();
        expect(component.notice).toContain('Nothing to compact');
    }

    @Test('compact command surfaces runtime error through rpc')
    async compactCommandReportsError() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.compactResult = { sessionId: 'console', compacted: false, error: 'turn-in-progress' };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/compact';
        await component.submit();

        const call = appRpc.calls.find(call => call.method === 'session.compact');
        expect(call).toBeTruthy();
        expect(component.notice).toContain('turn-in-progress');
    }

    @Test('diagnostics command shows aggregated turn diagnostics through rpc')
    async diagnosticsCommandShowsAggregateThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.turnDiagnosticsAggregate = {
            sessionIds: ['session-1'],
            totalTurns: 12,
            emptyResponseCount: 1,
            emptyResponseRate: 8.3,
            repeatedClarificationCount: 2,
            repeatedQuestionRate: 16.7,
            finalClarificationCount: 0,
            clarificationRate: 0,
            followUpRecoveryCount: 2,
            followUpRecoveryRate: 16.7,
            compactionCount: 3,
            totalTokenSavings: 25000,
            timeRange: { from: 0, to: 172800000 }
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/diagnostics';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'turn_diagnostics.stats' && !call.params?.sessionId)).toEqual(true);
        expect(component.notice).toContain('all sessions');
        expect(component.notice).toContain('12 turns');
        expect(component.notice).toContain('empty 8.3%');
        expect(component.notice).toContain('repeated 16.7%');
        expect(component.notice).toContain('3 compact(s)');
        expect(component.notice).toContain('saved 25K tokens');
    }

    @Test('diagnostics command passes session id and reports empty stats')
    async diagnosticsCommandReportsEmptyStats() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.turnDiagnosticsAggregate = null;
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/diagnostics session-1';
        await component.submit();

        const statsCall = appRpc.calls.find(call => call.method === 'turn_diagnostics.stats' && call.params?.sessionId);
        expect(statsCall).toBeTruthy();
        expect(statsCall!.params.sessionId).toEqual('session-1');
        expect(component.notice).toContain("No turn diagnostics recorded for session 'session-1'.");

        component.input = '/diagnostics';
        await component.submit();
        expect(component.notice).toContain('No turn diagnostics recorded yet.');
    }

    @Test('diagnostics trend command renders per-session sparkline through rpc')
    async diagnosticsTrendCommandRendersSparklineThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.turnDiagnosticsTrend = [
            { sessionId: 'session-1', bucketStart: 0, recordCount: 3, emptyResponseCount: 1, repeatedClarificationCount: 1, followUpRecoveryCount: 1, compactionCount: 2, totalTokenSavings: 1000, avgCompressionRatio: 40 },
            { sessionId: 'session-1', bucketStart: 86400000, recordCount: 4, emptyResponseCount: 0, repeatedClarificationCount: 0, followUpRecoveryCount: 0, compactionCount: 1, totalTokenSavings: 2000, avgCompressionRatio: 55 },
            { sessionId: 'session-2', bucketStart: 0, recordCount: 2, emptyResponseCount: 0, repeatedClarificationCount: 0, followUpRecoveryCount: 0, compactionCount: 0, totalTokenSavings: 500, avgCompressionRatio: 0 }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/diagnostics trend';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'turn_diagnostics.trend' && !call.params?.sessionId)).toEqual(true);
        expect(component.notice).toContain('session-1');
        expect(component.notice).toContain('session-2');
        expect(component.notice).toContain('▅█');
        expect(component.notice).toContain('7 turns');
        expect(component.notice).toContain('saved 3K tokens');
    }

    @Test('diagnostics trend command passes session id and reports empty trend')
    async diagnosticsTrendCommandReportsEmptyTrend() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.turnDiagnosticsTrend = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/diagnostics trend session-1';
        await component.submit();

        const trendCall = appRpc.calls.find(call => call.method === 'turn_diagnostics.trend');
        expect(trendCall).toBeTruthy();
        expect(trendCall!.params.sessionId).toEqual('session-1');
        expect(component.notice).toContain("No turn diagnostics trend recorded for session 'session-1'.");

        component.input = '/diagnostics trend';
        await component.submit();
        expect(component.notice).toContain('No turn diagnostics trend recorded yet.');
    }

    @Test('diagnostics list command opens record selector through rpc')
    async diagnosticsListCommandOpensRecordSelectorThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.turnDiagnosticsRecords = [{
            id: 'diag-rec-1',
            sessionId: 'session-1',
            createdAt: 1720000000000,
            emptyResponseRetryCount: 1,
            followUpRecoveryCount: 2,
            followUpContextRewritten: true,
            finalAssistantWasClarification: false,
            repeatedClarificationDetected: true,
            compactionCount: 2,
            totalTokenSavings: 4000,
            compressionRatio: 50,
            compactionLevel: 'L3',
            promptCache: { provider: 'deepseek', applied: true, appliedStrategy: 'partial', cachedTokens: 512 }
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/diagnostics list session-1';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(appRpc.calls.some(call => call.method === 'turn_diagnostics.list' && call.params?.sessionId === 'session-1')).toEqual(true);
        expect(component.sessionState.selectMenu?.title).toEqual('Turn diagnostics records (session-1)');
        expect(component.sessionState.selectMenu?.options[0].label).toContain('session-1');
        expect(component.sessionState.selectMenu?.options[0].description).toContain('2 compacts');
        expect(component.sessionState.selectMenu?.options[0].description).toContain('saved 4K tokens');
        expect(component.sessionState.selectMenu?.options[0].detail).toContain('Compaction level: L3');
        expect(component.sessionState.selectMenu?.options[0].detail).toContain('Prompt cache: deepseek partial');

        await component.sessionState.cancelSelectMenu();
        await pending;
    }

    @Test('diagnostics list command falls back to current session without args')
    async diagnosticsListCommandUsesCurrentSession() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.turnDiagnosticsRecords = [{
            id: 'diag-rec-2',
            sessionId: 'console',
            createdAt: 1720000000000,
            emptyResponseRetryCount: 0,
            followUpRecoveryCount: 0,
            followUpContextRewritten: false,
            finalAssistantWasClarification: false,
            repeatedClarificationDetected: false,
            compactionCount: 0,
            totalTokenSavings: 0
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/diagnostics list';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(appRpc.calls.some(call => call.method === 'turn_diagnostics.list' && call.params?.sessionId === 'console')).toEqual(true);
        expect(component.sessionState.selectMenu?.title).toContain('console');

        await component.sessionState.cancelSelectMenu();
        await pending;
    }

    @Test('diagnostics list command reports empty records')
    async diagnosticsListCommandReportsEmptyRecords() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.turnDiagnosticsRecords = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/diagnostics list session-1';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'turn_diagnostics.list' && call.params?.sessionId === 'session-1')).toEqual(true);
        expect(component.notice).toContain("No turn diagnostics recorded for session 'session-1'.");
    }

    @Test('working usage tracks current tokens from stream and model completion')
    async workingUsageTracksCurrentTokens() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-usage' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentStreamChunkEvent(this, 'chat-usage', 'done', undefined, undefined, {
            promptTokens: 11,
            completionTokens: 13,
            totalTokens: 24
        }));

        expect(state.tokenUsage.totalTokens).toEqual(24);
        expect(state.tokenUsage.promptTokens).toEqual(11);
        expect(state.tokenUsage.completionTokens).toEqual(13);
        expect(state.turnTokenUsage.totalTokens).toEqual(24);

        await app.eventMulticaster.emit(new AgentModelCompletedEvent(this, 'chat-usage', {
            metadata: {
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                usage: {
                    prompt_tokens: 20,
                    completion_tokens: 22,
                    total_tokens: 42
                }
            }
        } as any));

        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(state.tokenUsage.totalTokens).toEqual(42);
        expect(state.tokenUsage.promptTokens).toEqual(20);
        expect(state.tokenUsage.completionTokens).toEqual(22);
        expect(state.turnTokenUsage.totalTokens).toEqual(42);

        state.resetTurnTokenUsage();
        state.setTokenUsage({ promptTokens: 3, completionTokens: 5, totalTokens: 8 });
        expect(state.turnTokenUsage.totalTokens).toEqual(8);
        expect(state.tokenUsage.totalTokens).toEqual(50);
    }

    @Test('model completion applies the runtime session cumulative usage as an absolute total')
    async modelCompletionAppliesCumulativeUsage() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-cumulative' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentStreamChunkEvent(this, 'chat-cumulative', 'done', undefined, undefined, {
            promptTokens: 11,
            completionTokens: 13,
            totalTokens: 24
        }));
        expect(state.tokenUsage.totalTokens).toEqual(24);

        await app.eventMulticaster.emit(new AgentModelCompletedEvent(this, 'chat-cumulative', {
            metadata: {
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                usage: { prompt_tokens: 11, completion_tokens: 13, total_tokens: 24 }
            }
        } as any, { promptTokens: 500, completionTokens: 250, totalTokens: 750 }));

        expect(state.tokenUsage.totalTokens).toEqual(750);
        expect(state.tokenUsage.promptTokens).toEqual(500);
        expect(state.tokenUsage.completionTokens).toEqual(250);
    }

    @Test('session cumulative usage is not clobbered by the next model call stream chunk')
    async sessionCumulativeUsageSurvivesNextStreamChunk() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-cumulative-guard' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentModelCompletedEvent(this, 'chat-cumulative-guard', {
            metadata: {
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                usage: { prompt_tokens: 400, completion_tokens: 200, total_tokens: 600 }
            }
        } as any, { promptTokens: 400, completionTokens: 200, totalTokens: 600 }));
        expect(state.tokenUsage.totalTokens).toEqual(600);

        // A later LLM call streams its own smaller per-call usage; the session
        // total must grow from the authoritative cumulative, not drop to it.
        await app.eventMulticaster.emit(new AgentStreamChunkEvent(this, 'chat-cumulative-guard', 'done', undefined, undefined, {
            promptTokens: 20,
            completionTokens: 10,
            totalTokens: 30
        }));

        expect(state.tokenUsage.totalTokens).toEqual(630);
        expect(state.tokenUsage.promptTokens).toEqual(420);
        expect(state.tokenUsage.completionTokens).toEqual(210);
    }

    @Test('working usage updates during app rpc streaming chunks')
    async workingUsageUpdatesDuringAppRpcStreamingChunks() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.messagesBySession.set('rpc-stream-usage', [
            { id: '1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: '2', role: 'assistant', content: 'hello', createdAt: 2 } as any
        ]);
        appRpc.streamChunks = [
            {
                type: 'text',
                content: 'hel',
                usage: {
                    promptTokens: 9,
                    completionTokens: 3,
                    totalTokens: 12
                }
            },
            {
                type: 'text',
                content: 'lo',
                usage: {
                    promptTokens: 9,
                    completionTokens: 5,
                    totalTokens: 14
                }
            },
            {
                type: 'done',
                usage: {
                    promptTokens: 9,
                    completionTokens: 5,
                    totalTokens: 14
                }
            }
        ];
        const { component, state } = createConsoleParts(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            appRpc
        );
        component.configure({ sessionId: 'rpc-stream-usage' });
        await component.onInit();

        component.input = 'hello';
        await component.submit();

        expect(state.tokenUsage.promptTokens).toEqual(9);
        expect(state.tokenUsage.completionTokens).toEqual(5);
        expect(state.tokenUsage.totalTokens).toEqual(14);
    }

    @Test('working usage restores from loaded session messages')
    async workingUsageRestoresFromLoadedSessionMessages() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.messagesBySession.set('persisted-usage', [
            { id: '1', role: 'user', content: 'hello', createdAt: 1 } as any,
            {
                id: '2',
                role: 'assistant',
                content: 'world',
                createdAt: 2,
                metadata: {
                    usage: {
                        prompt_tokens: 18,
                        completion_tokens: 6,
                        total_tokens: 24
                    }
                }
            } as any
        ]);
        const { component, state } = createConsoleParts(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService
        );
        component.configure({ sessionId: 'persisted-usage' });

        await component.onInit();

        expect(state.tokenUsage.promptTokens).toEqual(18);
        expect(state.tokenUsage.completionTokens).toEqual(6);
        expect(state.tokenUsage.totalTokens).toEqual(24);
    }

    @Test('working usage updates from app rpc done message metadata')
    async workingUsageUpdatesFromAppRpcDoneMessageMetadata() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.messagesBySession.set('rpc-done-usage', [
            { id: '1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: '2', role: 'assistant', content: 'hello', createdAt: 2 } as any
        ]);
        appRpc.streamChunks = [
            { type: 'text', content: 'hel' },
            {
                type: 'done',
                message: {
                    id: '3',
                    role: 'assistant',
                    content: 'hello',
                    createdAt: 3,
                    metadata: {
                        usage: {
                            prompt_tokens: 15,
                            completion_tokens: 4,
                            total_tokens: 19
                        }
                    }
                }
            }
        ];
        const { component, state } = createConsoleParts(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            appRpc
        );
        component.configure({ sessionId: 'rpc-done-usage' });
        await component.onInit();

        component.input = 'hello';
        await component.submit();

        expect(state.tokenUsage.promptTokens).toEqual(15);
        expect(state.tokenUsage.completionTokens).toEqual(4);
        expect(state.tokenUsage.totalTokens).toEqual(19);
        expect(state.messages[state.messages.length - 1]?.metadata?.streaming).toBe(false);
    }

    @Test('git-snapshots command diff without a ref reports usage')
    async gitSnapshotsCommandDiffWithoutRefReportsUsage() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await (component as any).openSession('chat-1');

        await (component as any).handleCommand('/git-snapshots diff');

        expect(component.sessionState.gitSnapshotOpen).toEqual(false);
    }

    @Test('git-snapshots command with an unknown action reports usage')
    async gitSnapshotsCommandUnknownActionReportsUsage() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await (component as any).openSession('chat-1');

        await (component as any).handleCommand('/git-snapshots bogus');

        expect(component.sessionState.gitSnapshotOpen).toEqual(false);
    }
}
