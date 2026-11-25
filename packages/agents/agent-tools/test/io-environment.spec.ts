import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createIoPortEnvironment } from '../src/io-environment';

@Suite('io-port environment transport')
export class IoPortEnvironmentTest {
    @Test('prefers native read/write hooks and uses shell commands for the rest')
    async transport() {
        const calls: string[] = [];
        const io: any = {
            remote: true,
            async runCommand(request: any) {
                calls.push(request.command);
                if (request.command.startsWith('find')) return { stdout: 'src\td\n', stderr: '', exitCode: 0 };
                return { stdout: '', stderr: '', exitCode: 0 };
            },
            async readTextFile(request: any) { calls.push(`read:${request.path}`); return { content: 'native' }; },
            async writeTextFile(request: any) { calls.push(`write:${request.path}:${request.content}`); }
        };
        const env = createIoPortEnvironment(io, '/remote');
        expect(env.kind).toEqual('remote');
        expect(await env.readText('/remote/a')).toEqual('native');
        await env.writeText('/remote/b', 'body');
        expect(await env.list('/remote')).toEqual([{ name: 'src', kind: 'directory' }]);
        await env.mkdir?.('/remote/c');
        await env.rename?.('/remote/c', '/remote/d');
        await env.remove?.('/remote/d', { force: true });
        expect(calls[0]).toEqual('read:/remote/a');
        expect(calls[1]).toEqual('write:/remote/b:body');
        expect(calls.some(call => call.startsWith('find'))).toEqual(true);
        expect(calls.some(call => call.startsWith('mkdir -p'))).toEqual(true);
        expect(calls.some(call => call.startsWith('mv -f'))).toEqual(true);
        expect(calls.some(call => call.startsWith('rm -r -f'))).toEqual(true);
    }
}
