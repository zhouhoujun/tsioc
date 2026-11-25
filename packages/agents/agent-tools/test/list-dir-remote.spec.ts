import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ListDirTool } from '../files/list-dir.tool';

@Suite('list_dir remote environment')
export class ListDirRemoteTest {
    @Test('lists entries through a remote environment without touching local fs')
    async listsRemote() {
        const tool = new ListDirTool({} as any);
        const result = await tool.invoke({ path: 'src' }, {
            sessionId: 's1',
            workspace: '/remote',
            environment: {
                kind: 'remote',
                root: '/remote',
                readText: async () => '',
                writeText: async () => undefined,
                list: async () => [
                    { name: 'b.ts', kind: 'file' },
                    { name: 'a.ts', kind: 'file' },
                    { name: '.hidden', kind: 'file' }
                ]
            }
        } as any);
        expect(result.entries.map((entry: any) => entry.name)).toEqual(['a.ts', 'b.ts']);
        expect(result.entries[0].path).toContain('a.ts');
        expect(result.truncated).toEqual(false);
    }
}
