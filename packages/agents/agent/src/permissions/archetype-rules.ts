import type { AgentArchetype } from '../archetype/AgentArchetype';
import type { PermissionRule } from './PermissionEngine';

/**
 * P1.1/P4: compile an archetype's `permissions.deny` list into agent-layer
 * permission rules. Deny is a hard floor, so a session/saved allow cannot
 * bypass a tool the active archetype forbids.
 */
export function compileArchetypePermissionRules(archetype?: AgentArchetype): PermissionRule[] {
    const deny = archetype?.permissions?.deny ?? [];
    return deny
        .map(pattern => String(pattern || '').trim())
        .filter(Boolean)
        .map(pattern => ({
            action: 'tool' as const,
            resource: pattern,
            effect: 'deny' as const,
            layer: 'agent' as const,
            from: `archetype:${archetype!.name}`
        }));
}
