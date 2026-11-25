import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createSshEnvironment } from '../src/environment';

@Suite('ssh environment transport')
export class SshEnvironmentTest {
    @Test('reads/writes/lists and mutates files over shell commands')
    async files() {
        const calls: string[] = [];
        const client = {
            async exec(command: string): Promise<any> {
                calls.push(command);
                if (command.startsWith('cat')) return { stdout: 'file-body', stderr: '', exitCode: 0, timedOut: false };
                if (command.startsWith('find')) return { stdout: 'src\td\nREADME.md\tf\n', stderr: '', exitCode: 0, timedOut: false };
                return { stdout: '', stderr: '', exitCode: 0, timedOut: false };
            }
        };
        const env = createSshEnvironment(client, '/remote');
        expect(env.kind).toEqual('remote');
        expect(await env.readText('/remote/a.txt')).toEqual('file-body');
        expect(await env.list('/remote')).toEqual([
            { name: 'src', kind: 'directory' },
            { name: 'README.md', kind: 'file' }
        ]);
        await env.writeText('/remote/b.txt', 'hello');
        await env.mkdir?.('/remote/c', { recursive: true });
        await env.rename?.('/remote/b.txt', '/remote/c.txt');
        await env.remove?.('/remote/c.txt', { force: true });
        expect(calls[0]).toContain("cat -- '/remote/a.txt'");
        expect(calls.some(call => call.includes('base64 -d') && call.includes("'/remote/b.txt'"))).toEqual(true);
        expect(calls.some(call => call.startsWith('mkdir -p'))).toEqual(true);
        expect(calls.some(call => call.startsWith('mv -f'))).toEqual(true);
        expect(calls.some(call => call.startsWith('rm -r -f'))).toEqual(true);
    }

    @Test('exec failures surface actionable stderr')
    async failure() {
        const env = createSshEnvironment({
            async exec(): Promise<any> { return { stdout: '', stderr: 'permission denied', exitCode: 1, timedOut: false }; }
        });
        let caught: any;
        try {
            await env.readText('/root/secret');
        } catch (error) {
            caught = error;
        }
        expect(String(caught?.message)).toContain('permission denied');
    }
}
