import { Injectable } from '@tsdi/ioc';
import { createCoapPlugin } from './builtins/coap';
import { createMqttPlugin } from './builtins/mqtt';
import { createNatsPlugin } from './builtins/nats';
import { createRedisPlugin } from './builtins/redis';
import { toWorkflowPluginManifest, WorkflowPlugin, WorkflowPluginManifest } from './types';

const BUILT_IN_FACTORIES: Record<string, () => WorkflowPlugin> = {
    mqtt: createMqttPlugin,
    redis: createRedisPlugin,
    nats: createNatsPlugin,
    coap: createCoapPlugin
};

/** Plugin ids bundled with @tsdi/activities. */
export const BUILT_IN_WORKFLOW_PLUGIN_IDS = Object.keys(BUILT_IN_FACTORIES);

export function createBuiltInWorkflowPlugin(id: string): WorkflowPlugin | undefined {
    return BUILT_IN_FACTORIES[id]?.();
}

/** Injectable catalog used by hosts and the plugin HTTP API. */
@Injectable()
export class WorkflowPluginCatalog {
    list(): WorkflowPluginManifest[] {
        return listBuiltInWorkflowPlugins();
    }

    create(id: string): WorkflowPlugin | undefined {
        return createBuiltInWorkflowPlugin(id);
    }
}

export function listBuiltInWorkflowPlugins(): WorkflowPluginManifest[] {
    return BUILT_IN_WORKFLOW_PLUGIN_IDS
        .map(id => createBuiltInWorkflowPlugin(id))
        .filter((plugin): plugin is WorkflowPlugin => !!plugin)
        .map(plugin => toWorkflowPluginManifest(plugin));
}
