import expect = require('expect');
import { FileAdapter, IReadable } from '@tsdi/common';
import { Suite, Test } from '@tsdi/unit';
import { PluginRegistry, sanitizePluginManifest } from '../src/plugins/PluginManifest';
import { PluginController } from '../src/plugins/PluginController';

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
}

function manifest(overrides: Record<string, any> = {}): any {
    return {
        id: 'demo',
        name: 'Demo',
        hooks: { beforeTool: { type: 'http', url: 'http://hook' } },
        tools: { hide: ['secret_tool'], rename: { old_tool: 'new_tool' }, namespace: { prefix: 'demo' } },
        config: { mode: 'safe' },
        ...overrides
    };
}

@Suite('plugin manifests')
export class PluginManifestTest {
    @Test('sanitizes manifests and drops entries without ids')
    sanitize() {
        expect(sanitizePluginManifest({})).toBeNull();
        const parsed = sanitizePluginManifest(manifest());
        expect(parsed?.id).toEqual('demo');
        expect(parsed?.enabled).toEqual(true);
        expect(parsed?.tools?.hide).toEqual(['secret_tool']);
    }

    @Test('merges enabled hook/config and applies per-plugin tool transforms')
    registry() {
        const registry = new PluginRegistry([
            manifest({ id: 'a', config: { a: 1 }, tools: { hide: ['x'] } }),
            manifest({ id: 'b', enabled: false, config: { b: 2 }, tools: { hide: ['y'] } }),
            manifest({ id: 'c', config: { c: 3 } })
        ]);
        expect(registry.enabled().map(plugin => plugin.id)).toEqual(['a', 'c']);
        expect(registry.config()).toEqual({ a: 1, c: 3 });
        expect(Array.isArray((registry.hookOptions() as any).beforeTool)).toEqual(true);
        expect((registry.hookOptions() as any).beforeTool.length).toEqual(2);

        const calls: string[] = [];
        registry.applyToolTransforms({
            add: () => calls.push('add'),
            hide: (name: string) => calls.push(`hide:${name}`),
            rename: (from: string, to: string) => calls.push(`rename:${from}:${to}`),
            namespace: (prefix: string, names?: string[]) => calls.push(`namespace:${prefix}:${(names ?? []).length}`)
        } as any);
        expect(calls).toContain('hide:x');
        expect(calls).not.toContain('hide:y');
        expect(calls).toContain('namespace:demo:0');

        expect(registry.setEnabled('b', true)).toEqual(true);
        expect(registry.isEnabled('b')).toEqual(true);
        expect(registry.config()).toEqual({ a: 1, c: 3, b: 2 });
        expect(registry.setEnabled('missing', true)).toEqual(false);
    }

    @Test('controller re-applies hooks/transforms and persists enable flags')
    async controllerPersists() {
        const adapter = new MemoryFileAdapter();
        const transforms: string[] = [];
        const rebuilt: any[] = [];
        const toolRegistry: any = {
            clearTransforms: () => transforms.push('clear'),
            transform: (apply: any) => { transforms.push('transform'); apply({ add: () => undefined, hide: () => undefined, rename: () => undefined, namespace: () => undefined }); }
        };
        const controller = new PluginController({
            plugins: [manifest()],
            toolRegistry,
            fileAdapter: adapter,
            workspace: () => '/work/app',
            rebuildHooks: hooks => rebuilt.push(hooks)
        });
        await controller.load();
        expect(rebuilt.length).toEqual(1);
        expect(transforms).toContain('clear');

        expect(await controller.setEnabled('demo', false)).toEqual(true);
        const stored = JSON.parse(await adapter.readText('/work/app/.tsdi-agent/plugins.json'));
        expect(stored.plugins[0].enabled).toEqual(false);

        const reloaded = new PluginController({
            toolRegistry,
            fileAdapter: adapter,
            workspace: () => '/work/app',
            rebuildHooks: hooks => rebuilt.push(hooks)
        });
        await reloaded.load();
        expect(reloaded.list()[0].id).toEqual('demo');
        expect(reloaded.list()[0].enabled).toEqual(false);
    }
}
