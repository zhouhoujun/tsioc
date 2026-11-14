import { AgentOptions, resolveAgentSandboxPolicy } from '../options';
import { SandboxMode } from './sandbox-exec';

/**
 * Effective OS sandbox mode: an explicit session override wins, otherwise the
 * policy chain (workspace/session/request) and finally the secure workspace
 * default. Kept outside the runtime so the ratchet stays green.
 */
export function effectiveSandboxMode(override: SandboxMode | undefined, options?: AgentOptions): SandboxMode {
    return override ?? resolveAgentSandboxPolicy(options).value.mode ?? 'workspace';
}
