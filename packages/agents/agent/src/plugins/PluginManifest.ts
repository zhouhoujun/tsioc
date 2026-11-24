import type { AgentHookStageOptions } from '../hooks/AgentHooks';
import type { AgentTool } from '../tools/AgentTool';
import type { ToolTransformEditor } from '../tools/ToolRegistry';

export interface AgentPluginToolSpec {
    hide?: string[];
    rename?: Record<string, string>;
    namespace?: { prefix: string; names?: string[] };
}

/** P2.3: plugin manifest (hooks / tool transforms / config), enabled per workspace. */
export interface AgentPluginManifest {
    id: string;
    name?: string;
    version?: string;
    description?: string;
    enabled?: boolean;
    hooks?: AgentHookStageOptions;
    tools?: AgentPluginToolSpec;
    config?: Record<string, any>;
    /** Code-provided tools; JSON manifests carry names/transforms only. */
    toolsAdd?: AgentTool[];
}

export function sanitizePluginManifest(input: any): AgentPluginManifest | null {
    const id = String(input?.id || '').trim();
    if (!id) {
        return null;
    }
    const tools: AgentPluginToolSpec = {};
    if (Array.isArray(input?.tools?.hide)) {
        tools.hide = input.tools.hide.map((name: any) => String(name)).filter(Boolean);
    }
    if (input?.tools?.rename && typeof input.tools.rename === 'object') {
        const rename: Record<string, string> = {};
        for (const [from, to] of Object.entries(input.tools.rename)) {
            if (from && typeof to === 'string' && to.trim()) rename[from] = to.trim();
        }
        if (Object.keys(rename).length) tools.rename = rename;
    }
    if (input?.tools?.namespace?.prefix) {
        tools.namespace = {
            prefix: String(input.tools.namespace.prefix),
            ...(Array.isArray(input.tools.namespace.names)
                ? { names: input.tools.namespace.names.map((name: any) => String(name)) }
                : {})
        };
    }
    return {
        id,
        ...(input?.name ? { name: String(input.name) } : {}),
        ...(input?.version ? { version: String(input.version) } : {}),
        ...(input?.description ? { description: String(input.description) } : {}),
        enabled: input?.enabled !== false,
        ...(input?.hooks && typeof input.hooks === 'object' ? { hooks: input.hooks } : {}),
        ...(Object.keys(tools).length ? { tools } : {}),
        ...(input?.config && typeof input.config === 'object' && !Array.isArray(input.config) ? { config: input.config } : {}),
        ...(Array.isArray(input?.toolsAdd) ? { toolsAdd: input.toolsAdd } : {})
    };
}

function mergeStageOptions(base: AgentHookStageOptions | undefined, extra: AgentHookStageOptions | undefined): AgentHookStageOptions {
    const merged: AgentHookStageOptions = { ...(base ?? {}) };
    for (const [stage, value] of Object.entries(extra ?? {}) as Array<[keyof AgentHookStageOptions, any]>) {
        if (!value) continue;
        const previous = (merged as any)[stage];
        const list = (item: any) => Array.isArray(item) ? item : item ? [item] : [];
        (merged as any)[stage] = [...list(previous), ...list(value)];
    }
    return merged;
}

/** Enabled plugin manifests, merged hooks/config and tool transforms. */
export class PluginRegistry {
    private readonly plugins: AgentPluginManifest[];

    constructor(plugins: AgentPluginManifest[] | undefined) {
        this.plugins = (plugins ?? []).map(sanitizePluginManifest).filter((plugin): plugin is AgentPluginManifest => !!plugin);
    }

    list(): AgentPluginManifest[] {
        return this.plugins.map(plugin => ({
            ...plugin,
            toolsAdd: plugin.toolsAdd ? [...plugin.toolsAdd] : undefined,
            hooks: plugin.hooks ? { ...plugin.hooks } : undefined
        }));
    }

    enabled(): AgentPluginManifest[] {
        return this.plugins.filter(plugin => plugin.enabled !== false);
    }

    isEnabled(id: string): boolean {
        return this.enabled().some(plugin => plugin.id === id);
    }

    setEnabled(id: string, enabled: boolean): boolean {
        const plugin = this.plugins.find(item => item.id === id);
        if (!plugin) {
            return false;
        }
        plugin.enabled = enabled;
        return true;
    }

    hookOptions(): AgentHookStageOptions {
        return this.enabled().reduce((merged, plugin) => mergeStageOptions(merged, plugin.hooks), {} as AgentHookStageOptions);
    }

    config(): Record<string, any> {
        return this.enabled().reduce((merged, plugin) => ({ ...merged, ...(plugin.config ?? {}) }), {} as Record<string, any>);
    }

    applyToolTransforms(editor: ToolTransformEditor): void {
        for (const plugin of this.enabled()) {
            const tools = plugin.tools;
            if (!tools) continue;
            for (const name of tools.hide ?? []) editor.hide(name);
            for (const [from, to] of Object.entries(tools.rename ?? {})) editor.rename(from, to);
            if (tools.namespace) editor.namespace(tools.namespace.prefix, tools.namespace.names);
            for (const tool of plugin.toolsAdd ?? []) editor.add(tool);
        }
    }

    toJSON(): AgentPluginManifest[] {
        return this.plugins.map(plugin => ({
            id: plugin.id,
            ...(plugin.name ? { name: plugin.name } : {}),
            ...(plugin.version ? { version: plugin.version } : {}),
            ...(plugin.description ? { description: plugin.description } : {}),
            enabled: plugin.enabled !== false,
            ...(plugin.hooks ? { hooks: plugin.hooks } : {}),
            ...(plugin.tools ? { tools: plugin.tools } : {}),
            ...(plugin.config ? { config: plugin.config } : {})
        }));
    }
}
