import { ActivityContext, ActivityResult } from '../activities/Activity';
import { IVisualWorkflowNode, WorkflowNodeDefinition } from '../visual/types';
import type { WorkflowNodeRegistry } from '../visual/node-registry';
import type { WorkflowServiceRegistry } from './service-registry';

/** Serializable subset of a plugin node definition (functions removed). */
export type WorkflowPluginNodeManifest = Omit<WorkflowNodeDefinition, 'execute' | 'activityType'>;

/** Serialized plugin descriptor returned by the plugin API. */
export interface WorkflowPluginManifest {
    id: string;
    name: string;
    description?: string;
    version?: string;
    nodes: WorkflowPluginNodeManifest[];
}

/** A service owned by a plugin. `dispose` runs when the plugin is uninstalled. */
export interface WorkflowPluginService {
    dispose?(): void | Promise<void>;
}

export interface WorkflowPluginContext {
    nodes: WorkflowNodeRegistry;
    services: WorkflowServiceRegistry;
    plugin: WorkflowPlugin;
}

/**
 * Host extension unit. Install with `WorkflowPluginRegistry.install()`.
 *
 * Plugins may contribute palette/runtime nodes and named services. Services
 * are exposed to node executors and to custom task nodes through
 * `context.services`.
 */
export interface WorkflowPlugin {
    id: string;
    name: string;
    description?: string;
    version?: string;
    nodes?: Array<WorkflowNodeDefinition & {
        execute?: (node: IVisualWorkflowNode, context: ActivityContext) => Promise<ActivityResult> | ActivityResult;
    }>;
    services?: Record<string, any> | (() => Record<string, any>);
    setup?(context: WorkflowPluginContext): void | Promise<void>;
    dispose?(context: WorkflowPluginContext): void | Promise<void>;
}

/** Remove functions so a plugin can be sent to the designer browser. */
export function toWorkflowPluginManifest(plugin: WorkflowPlugin): WorkflowPluginManifest {
    return {
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        nodes: (plugin.nodes || []).map(node => {
            const { execute, activityType, ...manifest } = node;
            return JSON.parse(JSON.stringify(manifest)) as WorkflowPluginNodeManifest;
        })
    };
}
