import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { fillTemplate, truncateByDisplayWidth } from '../src/AgentConsoleText';

@Suite('agent console text utilities')
export class AgentConsoleTextUtilitiesTest {
    @Test('fills placeholder templates without touching unknown keys')
    fillsPlaceholders() {
        expect(fillTemplate('{count} files in {name}', { count: 2, name: 'src' })).toEqual('2 files in src');
        expect(fillTemplate('{count} / {missing}', { count: 1 })).toEqual('1 / {missing}');
    }

    @Test('truncates by display width with an ellipsis')
    truncatesText() {
        expect(truncateByDisplayWidth('hello', 10)).toEqual('hello');
        expect(truncateByDisplayWidth('hello world', 8)).toEqual('hello w…');
        expect(truncateByDisplayWidth('你好世界', 5)).toEqual('你好…');
        expect(truncateByDisplayWidth('hello', 0)).toEqual('');
    }
}
