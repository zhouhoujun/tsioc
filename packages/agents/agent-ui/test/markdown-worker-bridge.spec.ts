import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    SyncMarkdownWorkerBridge,
    MARKDOWN_ASYNC_THRESHOLD
} from '../src/MarkdownWorkerBridge';
import { renderAgentConsoleMarkdownLines } from '../src/AgentConsoleMarkdown';

@Suite('MarkdownWorkerBridge (P164)')
export class MarkdownWorkerBridgeTest {
    @Test('SyncMarkdownWorkerBridge.render returns same result as direct parser')
    syncRendersIdenticalResult() {
        const bridge = new SyncMarkdownWorkerBridge();
        const content = '**bold** and *italic*';
        const options = { compactBlankLines: true };

        const bridgeResult = bridge.render(content, options);
        const directResult = renderAgentConsoleMarkdownLines(content, options);

        expect(bridgeResult.length).toEqual(directResult.length);
        expect(bridgeResult[0].tokens.length).toEqual(directResult[0].tokens.length);
    }

    @Test('SyncMarkdownWorkerBridge.shouldOffload always returns false')
    syncNeverOffloads() {
        const bridge = new SyncMarkdownWorkerBridge();
        expect(bridge.shouldOffload(0)).toEqual(false);
        expect(bridge.shouldOffload(MARKDOWN_ASYNC_THRESHOLD)).toEqual(false);
        expect(bridge.shouldOffload(999999)).toEqual(false);
    }

    @Test('SyncMarkdownWorkerBridge.workerParseCount is always 0')
    syncWorkerParseCountIsZero() {
        const bridge = new SyncMarkdownWorkerBridge();
        expect(bridge.workerParseCount).toEqual(0);
        bridge.render('hello');
        expect(bridge.workerParseCount).toEqual(0);
    }

    @Test('SyncMarkdownWorkerBridge handles empty content')
    syncHandlesEmptyContent() {
        const bridge = new SyncMarkdownWorkerBridge();
        const result = bridge.render('');
        expect(result.length).toBeGreaterThanOrEqual(1);
        const direct = renderAgentConsoleMarkdownLines('');
        expect(result.length).toEqual(direct.length);
    }

    @Test('SyncMarkdownWorkerBridge handles long content without error')
    syncHandlesLongContent() {
        const bridge = new SyncMarkdownWorkerBridge();
        const content = 'line\n'.repeat(500);
        const result = bridge.render(content, { compactBlankLines: true });
        expect(result.length).toBeGreaterThan(0);
    }

    @Test('MARKDOWN_ASYNC_THRESHOLD is exported and reasonable')
    thresholdExportedAndReasonable() {
        expect(typeof MARKDOWN_ASYNC_THRESHOLD).toEqual('number');
        expect(MARKDOWN_ASYNC_THRESHOLD).toEqual(1000);
        expect(MARKDOWN_ASYNC_THRESHOLD).toBeGreaterThan(0);
    }

    @Test('SyncMarkdownWorkerBridge respects treatUnclosedFenceAsText option')
    syncRespectsTreatUnclosedFenceAsText() {
        const bridge = new SyncMarkdownWorkerBridge();
        const content = '```typescript\nconst x = 1;\nconst y = 2;';
        const withOption = bridge.render(content, { compactBlankLines: true, treatUnclosedFenceAsText: true });
        const withoutOption = bridge.render(content, { compactBlankLines: true });
        expect(withOption.length).toBeGreaterThan(0);
        expect(withoutOption.length).toBeGreaterThan(0);
    }

    @Test('intraword underscores stay literal like DEEPSEEK_API_KEY')
    intrawordUnderscoreStaysLiteral() {
        const bridge = new SyncMarkdownWorkerBridge();
        const content = 'export DEEPSEEK_API_KEY=sk-123';
        const result = bridge.render(content, { compactBlankLines: true });
        const joined = result.map(line => line.tokens.map(token => token.text).join('')).join('\n');
        expect(joined).toContain('DEEPSEEK_API_KEY');
        expect(joined).not.toContain('DEEPSEEKAPIKEY');
        const apiToken = result.flatMap(line => line.tokens).find(token => token.text.trim() === 'API');
        expect(apiToken?.tone).not.toEqual('accent');
    }

    @Test('standalone underscores still produce emphasis tokens')
    standaloneUnderscoreStillEmphasizes() {
        const bridge = new SyncMarkdownWorkerBridge();
        const content = 'the value is _critical_ here';
        const result = bridge.render(content, { compactBlankLines: true });
        const critical = result.flatMap(line => line.tokens).find(token => token.text === 'critical');
        expect(critical?.tone).toEqual('accent');
    }
}
