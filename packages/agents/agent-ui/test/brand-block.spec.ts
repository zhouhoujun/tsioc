import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { buildAgentConsoleBrandBlock } from '../src/AgentConsoleBrand';
import { getDisplayWidth } from '../src/AgentConsoleTextWidth';

@Suite('console brand card')
export class ConsoleBrandCardTest {
    @Test('lays out semantic title, rule and meta rows')
    brandCard() {
        const lines = buildAgentConsoleBrandBlock(100, 'TSDI-AGENT', 'deepseek-flash', '/tmp/ws');
        expect(lines.map(line => line.role)).toEqual(['title', 'rule', 'meta']);
        expect(lines[0].text).toContain('T S D I');
        expect(lines[1].text).toEqual('· · ·');
        expect(lines[2].text).toContain('deepseek-flash');
        expect(lines[2].text).toContain('/tmp/ws');
    }

    @Test('clips the meta line instead of overflowing a narrow terminal')
    narrowBrandCard() {
        const lines = buildAgentConsoleBrandBlock(40, 'TSDI-AGENT', 'deepseek-flash', '/home/zhouyou/workspace/sleep-mlt');
        const meta = lines.find(line => line.role === 'meta')!;
        expect(getDisplayWidth(meta.text)).toBeLessThanOrEqual(34);
        expect(meta.text.includes('…')).toEqual(true);
    }
}
