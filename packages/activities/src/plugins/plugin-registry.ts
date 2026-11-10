import { Injectable, OnDestroy } from '@tsdi/ioc';
import { WorkflowNodeRegistry } from '../visual/node-registry';
import { WorkflowServiceRegistry } from './service-registry';
import {
    toWorkflowPluginManifest,
    WorkflowPlugin,
    WorkflowPluginContext,
    WorkflowPluginManifest
} from './types';

interface InstalledPlugin {
    plugin: WorkflowPlugin;
    nodeTypes: string[];
    serviceNames: string[];
}

/**
 * Install/uninstall workflow plugins. Installing a plugin registers its nodes
 * in the shared palette/runtime registry and exposes its services to workflow
 * execution through {@link WorkflowServiceRegistry}.
 */
@Injectable()
export class WorkflowPluginRegistry implements OnDestroy {
    private readonly installed = new Map<string, InstalledPlugin>();

    constructor(
        private readonly nodes: WorkflowNodeRegistry,
        private readonly services: WorkflowServiceRegistry
    ) { }

    get nodeRegistry(): WorkflowNodeRegistry {
        return this.nodes;
    }

    get serviceRegistry(): WorkflowServiceRegistry {
        return this.services;
    }

    isInstalled(id: string): boolean {
        return this.installed.has(id);
    }

    get(id: string): WorkflowPlugin | undefined {
        return this.installed.get(id)?.plugin;
    }

    list(): WorkflowPluginManifest[] {
        return Array.from(this.installed.values()).map(entry => toWorkflowPluginManifest(entry.plugin));
    }

    ids(): string[] {
        return Array.from(this.installed.keys());
    }

    async install(plugin: WorkflowPlugin): Promise<boolean> {
        if (!plugin?.id) {
            throw new Error('Workflow plugin requires an id');
        }
        if (this.installed.has(plugin.id)) {
            return false;
        }
        const nodeTypes: string[] = [];
        for (const node of plugin.nodes || []) {
            if (!node?.type) {
                continue;
            }
            this.nodes.register({
                ...node,
                pluginId: plugin.id,
                requiresServer: node.requiresServer !== false
            });
            nodeTypes.push(node.type);
        }
        const provided = typeof plugin.services === 'function' ? plugin.services() : plugin.services;
        const serviceNames: string[] = [];
        Object.entries(provided || {}).forEach(([name, service]) => {
            this.services.set(name, service);
            serviceNames.push(name);
        });
        const context: WorkflowPluginContext = {
            nodes: this.nodes,
            services: this.services,
            plugin
        };
        try {
            await plugin.setup?.(context);
        } catch (error) {
            nodeTypes.forEach(type => this.nodes.unregister(type));
            serviceNames.forEach(name => this.services.remove(name));
            throw error;
        }
        this.installed.set(plugin.id, { plugin, nodeTypes, serviceNames });
        return true;
    }

    async uninstall(id: string): Promise<boolean> {
        const entry = this.installed.get(id);
        if (!entry) {
            return false;
        }
        this.installed.delete(id);
        const context: WorkflowPluginContext = {
            nodes: this.nodes,
            services: this.services,
            plugin: entry.plugin
        };
        try {
            await entry.plugin.dispose?.(context);
        } finally {
            entry.nodeTypes.forEach(type => this.nodes.unregister(type));
            for (const name of entry.serviceNames) {
                const service = this.services.get(name);
                try {
                    await service?.dispose?.();
                } finally {
                    this.services.remove(name);
                }
            }
        }
        return true;
    }

    async uninstallAll(): Promise<void> {
        for (const id of this.ids()) {
            await this.uninstall(id);
        }
    }

    manifests(): WorkflowPluginManifest[] {
        return this.list();
    }

    async onDestroy(): Promise<void> {
        await this.uninstallAll();
    }
}
