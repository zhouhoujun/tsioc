import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ListDirTool } from '../files/list-dir.tool';
import { MkdirTool } from '../files/mkdir.tool';
import { DeleteFileTool } from '../files/delete-file.tool';
import { CopyFileTool } from '../files/copy-file.tool';
import { MoveFileTool } from '../files/move-file.tool';

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

    @Test('mkdir/delete use the remote environment operations')
    async mkdirAndDelete() {
        const calls: string[] = [];
        const environment: any = {
            kind: 'remote', root: '/remote',
            readText: async () => '', writeText: async () => undefined, list: async () => [],
            mkdir: async (path: string, options: any) => { calls.push(`mkdir:${path}:${options?.recursive}`); },
            remove: async (path: string, options: any) => { calls.push(`remove:${path}:${options?.force}`); }
        };
        await new MkdirTool({} as any).invoke({ path: 'src', recursive: true }, { sessionId: 's1', workspace: '/remote', environment } as any);
        await new DeleteFileTool({} as any).invoke({ path: 'src/a.ts', confirm: true }, { sessionId: 's1', workspace: '/remote', environment } as any);
        expect(calls).toEqual(['mkdir:/remote/src:true', 'remove:/remote/src/a.ts:true']);
    }

    @Test('copy/move use read/write/rename on a remote environment')
    async copyAndMove() {
        const calls: string[] = [];
        const environment: any = {
            kind: 'remote', root: '/remote',
            readText: async (path: string) => { calls.push(`read:${path}`); return 'content'; },
            writeText: async (path: string, content: string) => { calls.push(`write:${path}:${content}`); },
            list: async () => [],
            mkdir: async (path: string) => { calls.push(`mkdir:${path}`); },
            rename: async (from: string, to: string) => { calls.push(`rename:${from}:${to}`); },
            remove: async (path: string) => { calls.push(`remove:${path}`); }
        };
        await new CopyFileTool({} as any).invoke({ from: 'a.txt', to: 'b.txt' }, { sessionId: 's1', workspace: '/remote', environment } as any);
        await new MoveFileTool({} as any).invoke({ from: 'b.txt', to: 'c.txt' }, { sessionId: 's1', workspace: '/remote', environment } as any);
        expect(calls).toEqual([
            'read:/remote/a.txt', 'mkdir:/remote', 'write:/remote/b.txt:content',
            'rename:/remote/b.txt:/remote/c.txt'
        ]);
    }
}
