import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { AgentPluginManager, AgentPluginScope } from './plugin-manager';
import { RemoteSkillSource } from './types';

@Injectable()
export class AgentPluginTool implements AgentTool {
    name = 'plugins';
    description = 'Install, list, inspect, activate, or remove portable agent plugins containing skills, MCP servers, connectors, hooks, and scoped AGENTS instructions.';
    toolset = 'skills';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };
    inputSchema = {
        type: 'object', required: ['action'],
        properties: {
            action: { type: 'string', enum: ['install', 'list', 'inspect', 'activate', 'remove'] },
            roots: { type: 'object', description: 'Plugin roots keyed by local/personal/workspace/remote.' },
            source: { type: 'object', description: 'Remote source with id/type/url/ref.' },
            id: { type: 'string' }, scope: { type: 'string', enum: ['local', 'personal', 'workspace', 'remote'] },
            force: { type: 'boolean' }
        }
    };

    constructor(private manager: AgentPluginManager) {}

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const roots = { ...this.manager.defaultRoots(context.workspace), ...(input?.roots ?? {}) };
        const plugins = this.manager.discover(roots);
        switch (input?.action) {
            case 'list': return { plugins };
            case 'inspect': {
                const plugin = this.find(plugins, input?.id);
                return { plugin, contributions: this.manager.contributions([plugin]) };
            }
            case 'activate': {
                const plugin = this.manager.activate(this.find(plugins, input?.id));
                return { plugin, contributions: this.manager.contributions([plugin]) };
            }
            case 'install': {
                const source = this.parseSource(input?.source);
                const scope = (input?.scope || 'remote') as AgentPluginScope;
                const root = roots[scope];
                if (!root) throw new Error(`No plugin root configured for scope '${scope}'.`);
                return { plugin: await this.manager.install(source, root, scope, input?.force === true) };
            }
            case 'remove': {
                const plugin = this.find(plugins, input?.id);
                return { id: plugin.id, removed: this.manager.remove(plugin.id, plugin.root.substring(0, plugin.root.length - plugin.id.length - 1)) };
            }
            default: throw new Error('Invalid plugins action.');
        }
    }

    private find(plugins: ReturnType<AgentPluginManager['discover']>, id: unknown) {
        const plugin = plugins.find(item => item.id === String(id || ''));
        if (!plugin) throw new Error(`Plugin '${String(id || '')}' is not installed.`);
        this.manager.recordCall(plugin);
        return plugin;
    }

    private parseSource(value: any): RemoteSkillSource {
        if (!value?.id || !['git', 'registry'].includes(value.type) || !value.url) throw new Error('Plugin source requires id, type, and url.');
        return { id: String(value.id), type: value.type, url: String(value.url), ...(value.ref ? { ref: String(value.ref) } : {}) };
    }
}
