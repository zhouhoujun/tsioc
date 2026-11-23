import type { WorkflowDefinitionStore } from './workflow-store';
import type { WorkflowDesigner } from './workflow-designer';

/** Credential storage the host may expose (names only, never secret values). */
export type WorkflowCredentialStore = Partial<Pick<
    WorkflowDefinitionStore,
    'listCredentials' | 'setCredential' | 'removeCredential'
>>;

/** State patch returned to the designer component after a store round trip. */
export interface WorkflowCredentialState {
    /** Fresh names when the store answered; omitted on failure so the panel
     * keeps showing the last known list instead of going blank. */
    names?: string[];
    error: string;
    busy: boolean;
    /** True when a secret was written, so the draft fields can be cleared. */
    saved?: boolean;
}

export interface WorkflowCredentialMessages {
    unavailable: string;
    nameRequired: string;
    valueRequired: string;
}

function message(error: unknown): string {
    return (error as Error)?.message || String(error);
}

/**
 * Name list the host store exposes. The list doubles as validation input:
 * publishing checks `{{credential:name}}` against it, so a typo fails in the
 * editor instead of on the first run. `undefined` tells the designer the host
 * has no store, which skips name checks rather than flagging every reference.
 */
export async function refreshCredentialNames(
    store: WorkflowCredentialStore | undefined,
    designer: WorkflowDesigner | undefined,
    unavailable: string
): Promise<WorkflowCredentialState> {
    if (!store?.listCredentials) {
        designer?.setCredentialNames(undefined);
        return { error: unavailable, busy: false };
    }
    try {
        const names = await store.listCredentials();
        designer?.setCredentialNames(names);
        return { names, error: '', busy: false };
    } catch (error) {
        return { error: message(error), busy: false };
    }
}

/** Store a secret under a name, then refresh the list the panel shows. */
export async function saveCredentialSecret(
    store: WorkflowCredentialStore | undefined,
    designer: WorkflowDesigner | undefined,
    name: string,
    value: string,
    messages: WorkflowCredentialMessages
): Promise<WorkflowCredentialState> {
    if (!store?.setCredential) {
        return { error: messages.unavailable, busy: false };
    }
    const id = String(name ?? '').trim();
    if (!id) {
        return { error: messages.nameRequired, busy: false };
    }
    if (!value) {
        return { error: messages.valueRequired, busy: false };
    }
    try {
        await store.setCredential(id, value);
    } catch (error) {
        return { error: message(error), busy: false };
    }
    const state = await refreshCredentialNames(store, designer, messages.unavailable);
    return { ...state, saved: true };
}

/** Remove a stored secret and refresh the list. */
export async function removeCredentialSecret(
    store: WorkflowCredentialStore | undefined,
    designer: WorkflowDesigner | undefined,
    name: string,
    unavailable: string
): Promise<WorkflowCredentialState> {
    const id = String(name ?? '').trim();
    if (!id || !store?.removeCredential) {
        return { error: '', busy: false };
    }
    try {
        await store.removeCredential(id);
    } catch (error) {
        return { error: message(error), busy: false };
    }
    return refreshCredentialNames(store, designer, unavailable);
}
