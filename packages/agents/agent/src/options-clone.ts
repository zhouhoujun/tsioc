import type { AgentOptions } from './options';
import { defaultAgentOptions } from './options';

/**
 * Fresh mutable copy of the agent options.
 *
 * `AgentModule` used to inject the shared `defaultAgentOptions` singleton, so
 * any consumer that writes model/provider state (provider wizard, profile
 * activation, reasoning effort) leaked it into every later application in the
 * same process. Cloning the mutable sub-objects per application keeps each
 * runtime isolated without changing option semantics.
 */
export function cloneAgentOptions(options: AgentOptions = defaultAgentOptions): AgentOptions {
    const source: any = options || {};
    return {
        ...source,
        model: {
            ...(source.model || {}),
            ...(source.model?.profiles ? { profiles: { ...source.model.profiles } } : {})
        },
        ui: {
            ...(source.ui || {}),
            console: { ...(source.ui?.console || {}) }
        },
        policy: {
            ...(source.policy || {}),
            ...(source.policy?.limits ? { limits: { ...source.policy.limits } } : {})
        }
    } as AgentOptions;
}
