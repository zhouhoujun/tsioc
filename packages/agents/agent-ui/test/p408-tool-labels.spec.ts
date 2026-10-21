import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';

/**
 * Real session finding: tool rows fell back to the humanized identifier
 * (`read skill`) and stayed English under a zh locale because most builtin
 * tools had no display label. Every builtin tool must have both labels.
 */
@Suite('builtin tool labels')
export class BuiltinToolLabelTest {
    protected labels(bundle: any): Record<string, string> {
        return (bundle.messages as any).agent.tool as Record<string, string>;
    }

    @Test('English and Chinese label maps cover the same tools')
    async parity() {
        const en = Object.keys(this.labels(agentUiEnglish)).filter(key => key !== 'invoked');
        const zh = Object.keys(this.labels(agentUiChinese)).filter(key => key !== 'invoked');
        expect(en.sort()).toEqual(zh.sort());
    }

    @Test('every tool label is non-empty in both locales')
    async nonEmpty() {
        for (const bundle of [agentUiEnglish, agentUiChinese]) {
            const labels = this.labels(bundle);
            for (const key of Object.keys(labels)) {
                expect(String(labels[key] || '').trim().length).toBeGreaterThan(0);
            }
        }
    }

    @Test('builtin tools that used to fall back to the raw identifier are labelled')
    async coversBuiltinTools() {
        const names = [
            'read_skill', 'skill_list', 'skills_remote', 'memory.search', 'memory.put',
            'sessions_list', 'sessions_history', 'session_search', 'ssh_exec', 'ssh_tunnel',
            'lsp_diagnostics', 'lsp_definition', 'mcp.call_tool', 'playwright_browser',
            'execute_code', 'vision_analyze', 'text_to_speech', 'knowledge_search',
            'project_intel', 'security_scan', 'cron_manage', 'http_request', 'time'
        ];
        const en = this.labels(agentUiEnglish);
        const zh = this.labels(agentUiChinese);
        for (const name of names) {
            expect(en[name]).toBeTruthy();
            expect(zh[name]).toBeTruthy();
            expect(zh[name]).not.toEqual(en[name]);
        }
    }
}
