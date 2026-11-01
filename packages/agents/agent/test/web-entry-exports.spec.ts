import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as webEntry from '../src/web-entry';

/**
 * The browser bundle aliases `@tsdi/agent` to `src/web-entry.ts`, so every
 * runtime symbol the agent-ui graph imports must be exported here. Missing
 * exports silently become `undefined` in the browser and fail at startup
 * (e.g. `defaultAgentProviderRegistry.get` when restoring a model profile).
 */
@Suite('browser web entry')
export class WebEntryExportsTest {
    @Test('exports the runtime symbols the web console graph imports')
    exportsRuntimeSymbols() {
        const entry = webEntry as any;
        expect(typeof entry.defaultAgentProviderRegistry?.get).toEqual('function');
        expect(typeof entry.asModelFailure).toEqual('function');
        expect(typeof entry.describeModelFailure).toEqual('function');
        expect(typeof entry.ApprovalManager).toEqual('function');
        expect(typeof entry.buildHarnessProjection).toEqual('function');
        expect(typeof entry.formatHarnessTreeLines).toEqual('function');
        expect(typeof entry.formatHarnessListLines).toEqual('function');
        expect(entry.DEFAULT_RENDER_POLICY?.auxiliaryPreviewLines).toBeGreaterThan(0);
    }
}
