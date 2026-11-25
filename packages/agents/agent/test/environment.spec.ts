import expect = require('expect');
import { FileAdapter, IReadable } from '@tsdi/common';
import { Suite, Test } from '@tsdi/unit';
import { LocalEnvironment, createRemoteEnvironment } from '../src/environment/AgentEnvironment';
import { LocalToolRegistry } from '../src/tools/LocalToolRegistry';

class MemoryFileAdapter extends FileAdapter {
    files = new Map<string, string>();
    isAbsolute(path: string): boolean { return path.startsWith('/'); }
    normalize(path: string): string { return path; }
    join(...paths: string[]): string { return paths.join('/').replace(/\/+/g, '/'); }
    resolve(...paths: string[]): string { return this.join(...paths); }
    extname(path: string): string { const index = path.lastIndexOf('.'); return index >= 0 ? path.slice(index) : ''; }
    existsSync(path: string): boolean { return this.files.has(path); }
    read(): IReadable { throw new Error('stream not supported'); }
    async find(): Promise<null> { return null; }
    async readText(path: string): Promise<string> { const value = this.files.get(path); if (value === undefined) throw new Error('ENOENT'); return value; }
    readTextSync(path: string): string { return this.files.get(path) as string; }
    async readJSON<T = any>(path: string): Promise<T> { return JSON.parse(await this.readText(path)); }
    readJSONSync<T = any>(path: string): T { return JSON.parse(this.readTextSync(path)); }
    async writeText(path: string, content: string): Promise<void> { this.files.set(path, content); }
    async mkdir(): Promise<void> { return; }
    async remove(path: string): Promise<void> { this.files.delete(path); }
    async list(path: string) {
        return Array.from(this.files.keys()).filter(key => key.startsWith(path + '/')).map(key => ({ name: key.slice(path.length + 1), path: key, kind: 'file' as const }));
    }
}

@Suite('agent environment')
export class AgentEnvironmentTest {
    @Test('local environment reads/writes/lists through the file adapter')
    async local() {
        const adapter = new MemoryFileAdapter();
        const env = new LocalEnvironment(adapter, '/work');
        await env.writeText('/work/a.txt', 'hello');
        expect(await env.readText('/work/a.txt')).toEqual('hello');
        expect(await env.list('/work')).toEqual([{ name: 'a.txt', path: '/work/a.txt', kind: 'file' }]);
        await env.remove?.('/work/a.txt');
        expect(adapter.existsSync('/work/a.txt')).toEqual(false);
        expect(env.kind).toEqual('local');
    }

    @Test('remote environments delegate to the host transport')
    async remote() {
        const calls: string[] = [];
        const env = createRemoteEnvironment({
            readText: async path => { calls.push(`read:${path}`); return 'remote'; },
            writeText: async (path, content) => { calls.push(`write:${path}:${content}`); },
            list: async path => { calls.push(`list:${path}`); return []; },
            exec: async request => { calls.push(`exec:${request.command}`); return { stdout: 'ok', stderr: '', exitCode: 0 }; }
        }, '/remote');
        expect(env.kind).toEqual('remote');
        expect(await env.readText('/remote/x')).toEqual('remote');
        await env.writeText('/remote/x', 'v');
        expect(await env.exec?.({ command: 'ls' })).toEqual({ stdout: 'ok', stderr: '', exitCode: 0 });
        expect(calls).toEqual(['read:/remote/x', 'write:/remote/x:v', 'exec:ls']);
    }

    @Test('local tool registry passes the environment into tool contexts')
    async registryContext() {
        let received: any;
        const tool: any = {
            name: 'env_tool',
            description: 'captures context',
            getDefinition: () => ({ name: 'env_tool', description: 'captures context', activation: { kind: 'always', scope: 'global' } }),
            invoke: async (_input: any, context: any) => { received = context.environment; return { ok: true }; }
        };
        const registry = new LocalToolRegistry([tool], {} as any, {} as any, { isActive: () => true, activate: () => undefined } as any);
        const env = new LocalEnvironment(new MemoryFileAdapter(), '/work');
        registry.useEnvironment(env);
        await registry.invoke('env_tool', {}, 's1', undefined, '/work');
        expect(received).toBe(env);
    }
}
