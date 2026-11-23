import type { WorkflowNodeRegistry } from './node-registry';
import type { VisualWorkflowDefinition, IVisualWorkflowNode } from './types';

export interface MigratedSecret {
    nodeId: string;
    field: string;
    /** Credential name the value was stored under. */
    name: string;
}

export interface SecretMigrationFailure extends Omit<MigratedSecret, 'name'> {
    error: string;
}

export interface SecretMigrationResult {
    definition: VisualWorkflowDefinition;
    migrated: MigratedSecret[];
    failed: SecretMigrationFailure[];
}

/**
 * Stored credential reference forms the runtime resolves. A braced reference
 * needs a non-empty name; anything else counts as a raw value.
 */
export function isCredentialReference(value: any): boolean {
    if (typeof value !== 'string') {
        return false;
    }
    const text = value.trim();
    const braced = /^\{\{\s*credential:([^}]*)\}\}$/.exec(text);
    if (braced) {
        return braced[1].trim().length > 0;
    }
    return /^credential:[A-Za-z0-9_.-]+$/.test(text);
}

/** Credential names allow `[A-Za-z0-9_.-]`; ids may carry other characters. */
export function secretCredentialName(workflowId: string, nodeId: string, field: string): string {
    return `${workflowId}.${nodeId}.${field}`
        .replace(/[^A-Za-z0-9_.-]+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(0, 200);
}

/**
 * Move raw secret values out of the workflow document and into the host
 * credential store, replacing them with `{{credential:name}}`.
 *
 * Node-RED keeps credentials out of flow files; this is the equivalent for a
 * document that allows inline values. It is explicit and lossless:
 *
 * - only fields declared `secret` and holding a raw, non-empty value move;
 * - a store failure keeps the raw value and reports it (never loses a secret);
 * - references, empty values and non-secret fields are untouched;
 * - the returned definition is a new object only when something changed, and
 *   running the migration twice is a no-op.
 */
export async function migrateInlineSecrets(
    definition: VisualWorkflowDefinition,
    registry: WorkflowNodeRegistry,
    setCredential: (name: string, value: string) => Promise<void>
): Promise<SecretMigrationResult> {
    const migrated: MigratedSecret[] = [];
    const failed: SecretMigrationFailure[] = [];
    const nodes: IVisualWorkflowNode[] = [];
    let changed = false;

    for (const node of definition.nodes || []) {
        const fields = (registry.get(node.type)?.fields || []).filter(field => field.secret === true);
        if (!fields.length || !node.config) {
            nodes.push(node);
            continue;
        }
        let config = node.config;
        let nodeChanged = false;
        for (const field of fields) {
            const value = config[field.key];
            if (typeof value !== 'string' || !value.trim() || isCredentialReference(value)) {
                continue;
            }
            const name = secretCredentialName(definition.id, node.id, field.key);
            try {
                await setCredential(name, value);
            } catch (error) {
                failed.push({
                    nodeId: node.id,
                    field: field.key,
                    error: (error as Error)?.message || String(error)
                });
                continue;
            }
            if (config === node.config) {
                config = { ...config };
            }
            config[field.key] = `{{credential:${name}}}`;
            migrated.push({ nodeId: node.id, field: field.key, name });
            nodeChanged = true;
            changed = true;
        }
        nodes.push(nodeChanged ? { ...node, config } : node);
    }

    return {
        definition: changed ? { ...definition, nodes } : definition,
        migrated,
        failed
    };
}
