import type { FileAdapter } from '@tsdi/common';
import type { AgentHooksOptions } from '../hooks/AgentHooks';
import type { ToolRegistry } from '../tools/ToolRegistry';
import { AgentPluginManifest, PluginRegistry, sanitizePluginManifest } from './PluginManifest';
import { AgentHookManager } from '../hooks/AgentHooks';

export interface PluginControllerHost {
    plugins?: AgentPluginManifest[];
    toolRegistry: ToolRegistry;
    fileAdapter?: FileAdapter;
    workspace?(): string | undefined;
    rebuildHooks(hooks: AgentHooksOptions): void;
}

/** P2.3: per-workspace plugin manifests, live enable/disable and persistence. */
export class PluginController {
    private readonly registry: PluginRegistry;

    constructor(private readonly host: PluginControllerHost) {
        this.registry = new PluginRegistry(host.plugins);
    }

    list(): AgentPluginManifest[] { return this.registry.list(); }
    enabled(): AgentPluginManifest[] { return this.registry.enabled(); }
    config(): Record<string, any> { return this.registry.config(); }

    /** Hooks merged over the runtime hooks (plugins lose on duplicate stage definitions only by order). */
    hookOptions(base?: AgentHooksOptions): AgentHooksOptions {
        const pluginHooks = this.registry.hookOptions();
        const merged: AgentHooksOptions = { ...(base ?? {}) };
        for (const [stage, value] of Object.entries(pluginHooks) as Array<[keyof AgentHooksOptions, any]>) {
            if (!value) continue;
            const previous = (merged as any)[stage];
            const list = (item: any) => Array.isArray(item) ? item : item ? [item] : [];
            (merged as any)[stage] = [...list(previous), ...list(value)];
        }
        return merged;
    }

    /** Rebuild hooks and re-apply enabled tool transforms (idempotent). */
    apply(baseHooks?: AgentHooksOptions): void {
        this.host.rebuildHooks(this.hookOptions(baseHooks));
        this.host.toolRegistry.clearTransforms?.();
        this.host.toolRegistry.transform?.(editor => this.registry.applyToolTransforms(editor));
    }

    async setEnabled(id: string, enabled: boolean): Promise<boolean> {
        if (!this.registry.setEnabled(id, enabled)) {
            return false;
        }
        this.apply();
        await this.persist();
        return true;
    }

    /** Load workspace manifests (`.tsdi-agent/plugins.json`) and apply them. */
    async load(): Promise<void> {
        const workspace = this.host.workspace?.();
        const adapter = this.host.fileAdapter;
        if (!workspace || !adapter) {
            return;
        }
        const file = adapter.join(workspace, '.tsdi-agent', 'plugins.json');
        const text = await adapter.readText(file).catch(() => null);
        if (!text) {
            this.apply();
            return;
        }
        try {
            const parsed = JSON.parse(text);
            const list = Array.isArray(parsed) ? parsed : parsed?.plugins;
            const manifests = (Array.isArray(list) ? list : [])
                .map(sanitizePluginManifest)
                .filter((plugin): plugin is AgentPluginManifest => !!plugin);
            if (manifests.length) {
                (this.registry as any).plugins = manifests;
            }
        } catch {
            // a malformed plugins.json must not break runtime startup
        }
        this.apply();
    }

    private async persist(): Promise<void> {
        const workspace = this.host.workspace?.();
        const adapter = this.host.fileAdapter;
        if (!workspace || !adapter) {
            return;
        }
        const file = adapter.join(workspace, '.tsdi-agent', 'plugins.json');
        try {
            await adapter.mkdir(adapter.join(workspace, '.tsdi-agent'), { recursive: true });
            await adapter.writeText(file, JSON.stringify({ plugins: this.registry.toJSON() }, null, 2));
        } catch {
            // best-effort persistence; the in-memory registry stays authoritative
        }
    }
}

/** Wire a runtime component (facade) into a plugin controller without extra runtime lines. */
export function createRuntimePluginController(component: any): PluginController {
    const controller = new PluginController({
        plugins: component.options?.plugins,
        toolRegistry: component.toolRegistry,
        fileAdapter: component.fileAdapter,
        workspace: () => component.resolveWorkspace?.(),
        rebuildHooks: hooks => {
            component.hookManager = new AgentHookManager(hooks, component.hookExecutor);
            component.hooksController?.setManager(component.hookManager);
        }
    });
    controller.apply(component.options?.hooks);
    void controller.load();
    return controller;
}
