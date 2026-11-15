/**
 * Lazy completion helpers for the CodeMirror 6 editor.
 *
 * Keeping the scheduler in a dynamically imported module avoids pulling the
 * interaction code into the designer's initial bundle; the directive only
 * forwards view updates here once a code field is mounted.
 */

export interface CompletionRuntime {
    schedule(update: any): void;
    cancel(): void;
    dispose(): void;
}

export function buildCompletionScope(suggestions: string[]): Record<string, any> {
    const root: Record<string, any> = {};
    suggestions.forEach(path => {
        const parts = String(path || '').split('.').filter(Boolean);
        let node = root;
        for (const part of parts) {
            if (!node[part] || typeof node[part] !== 'object') {
                node[part] = {};
            }
            node = node[part];
        }
    });
    // The function arguments are always available even when no suggestion was
    // emitted for them (for example an empty workflow).
    ['context', 'input', 'msg'].forEach(name => {
        if (!root[name] || typeof root[name] !== 'object') {
            root[name] = {};
        }
    });
    return root;
}

export function createCompletionRuntime(api: any): CompletionRuntime {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cancel = (): void => {
        if (timer) {
            clearTimeout(timer);
            timer = undefined;
        }
    };

    return {
        schedule(update: any): void {
            if (!api || !update?.view?.hasFocus) {
                return;
            }
            let inserted = '';
            update.transactions.forEach((transaction: any) => {
                transaction.changes.iterChanges((_fromA: number, _toA: number, _fromB: number, _toB: number, text: any) => {
                    inserted += text.toString();
                });
            });
            if (!inserted) {
                return;
            }
            const member = inserted.endsWith('.') || inserted.endsWith('?.');
            const identifier = /[A-Za-z_$]$/.test(inserted);
            if (!member && !identifier) {
                return;
            }
            cancel();
            timer = setTimeout(() => {
                timer = undefined;
                if (!update.view || api.completionStatus(update.view.state)) {
                    return;
                }
                api.startCompletion(update.view);
            }, member ? 0 : 160);
        },
        cancel,
        dispose: cancel
    };
}
