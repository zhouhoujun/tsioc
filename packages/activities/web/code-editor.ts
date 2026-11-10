import { Directive, ElementRef, OnDestroy, noReact } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '@tsdi/components/common';
import type * as CodeMirror from 'codemirror';

function modeFor(language: string | null | undefined): string | object {
    switch (String(language || '').toLowerCase()) {
        case 'json':
            return { name: 'javascript', json: true };
        case 'xml':
        case 'html':
            return 'xml';
        case 'htmlmixed':
            return 'htmlmixed';
        case 'css':
            return 'css';
        case 'shell':
        case 'bash':
        case 'sh':
            return 'shell';
        case 'javascript':
        case 'js':
        case 'typescript':
        case 'ts':
        default:
            return 'javascript';
    }
}

function decodeValue(value: string | null): string {
    if (!value) {
        return '';
    }
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * Load CodeMirror core plus only the language mode needed by this field.
 * Dynamic imports become lazy chunks in the ESM designer build, so the editor
 * is not part of the initial page payload.
 */
async function loadCodeMirror(language: string | null | undefined): Promise<any> {
    const core: any = await import('codemirror');
    const CodeMirrorApi = core.default ?? core;
    const modes: Array<Promise<any>> = [];
    const lang = String(language || 'javascript').toLowerCase();
    // @ts-ignore - CodeMirror mode/addon packages have no type declarations.
    modes.push(import('codemirror/mode/javascript/javascript'));
    if (lang === 'xml' || lang === 'html') {
        // @ts-ignore
        modes.push(import('codemirror/mode/xml/xml'));
    } else if (lang === 'htmlmixed') {
        // @ts-ignore
        modes.push(import('codemirror/mode/xml/xml'));
        // @ts-ignore
        modes.push(import('codemirror/mode/css/css'));
        // @ts-ignore
        modes.push(import('codemirror/mode/htmlmixed/htmlmixed'));
    } else if (lang === 'css') {
        // @ts-ignore
        modes.push(import('codemirror/mode/css/css'));
    } else if (lang === 'shell' || lang === 'bash' || lang === 'sh') {
        // @ts-ignore
        modes.push(import('codemirror/mode/shell/shell'));
    }
    // @ts-ignore
    modes.push(import('codemirror/addon/edit/closebrackets'));
    // @ts-ignore
    modes.push(import('codemirror/addon/edit/matchbrackets'));
    // @ts-ignore - workflow-aware autocomplete (Ctrl+Space and after '.')
    modes.push(import('codemirror/addon/hint/show-hint'));
    // @ts-ignore
    modes.push(import('codemirror/addon/hint/javascript-hint'));
    await Promise.all(modes);
    return CodeMirrorApi;
}

function decodeSuggestions(value: string | null): string[] {
    if (!value) {
        return [];
    }
    try {
        const parsed = JSON.parse(decodeURIComponent(value));
        return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

interface HintTree {
    [prefix: string]: string[];
}

function collectHintNames(suggestions: string[], keywords: string[]): HintTree {
    const tree: Record<string, Set<string>> = {};
    const ensure = (prefix: string): Set<string> => {
        if (!tree[prefix]) {
            tree[prefix] = new Set<string>();
        }
        return tree[prefix];
    };
    suggestions.forEach(path => {
        const parts = String(path || '').split('.').filter(Boolean);
        for (let index = 0; index < parts.length; index++) {
            ensure(parts.slice(0, index).join('.')).add(parts[index]);
        }
    });
    keywords.forEach(word => ensure('').add(word));
    const result: HintTree = {};
    Object.keys(tree).forEach(prefix => {
        result[prefix] = Array.from(tree[prefix]).sort();
    });
    return result;
}

function createWorkflowHint(CodeMirrorApi: any, suggestions: string[]): any {
    const keywords = [
        'return', 'const', 'let', 'var', 'function', 'if', 'else', 'for', 'while', 'do',
        'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new',
        'await', 'async', 'true', 'false', 'null', 'undefined', 'console'
    ];
    const tree = collectHintNames(suggestions, keywords);
    return (cm: any, options: any) => {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line) || '';
        const before = line.slice(0, cursor.ch);
        const member = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)?$/.exec(before);
        let list: string[] = [];
        let from = cursor;
        if (member) {
            const token = member[2] || '';
            list = tree[member[1]] || [];
            from = CodeMirrorApi.Pos(cursor.line, cursor.ch - token.length);
        } else {
            const token = (/[A-Za-z_$][\w$]*$/.exec(before) || [''])[0];
            list = [...(tree[''] || [])];
            try {
                const jsHint = CodeMirrorApi.hint?.javascript?.(cm, options);
                if (jsHint?.list?.length) {
                    list.push(...jsHint.list);
                }
            } catch {
                // The optional javascript-hint addon is best-effort.
            }
            from = CodeMirrorApi.Pos(cursor.line, cursor.ch - token.length);
        }
        const seen = new Set<string>();
        const unique: string[] = [];
        for (const item of list) {
            const text = typeof item === 'string' ? item : String((item as any)?.text ?? '');
            if (text && !seen.has(text)) {
                seen.add(text);
                unique.push(text);
            }
        }
        return { list: unique.slice(0, 200), from, to: cursor };
    };
}

/**
 * Progressive-enhancement code editor for dynamic-form code textareas
 * (`[data-dynamic-code]`, plus the legacy `[workflow-code-editor]` selector).
 *
 * The renderer-neutral form only emits a plain textarea; HTML hosts that import
 * `WorkflowCodeEditorModule` get CodeMirror (MIT) on top without coupling the
 * shared form to a browser editor implementation.
 */
@Directive({ selector: '[data-dynamic-code],[workflow-code-editor]' })
export class WorkflowCodeMirrorDirective implements OnDestroy {
    protected editor?: CodeMirror.EditorFromTextArea;
    protected observer?: MutationObserver;
    protected syncing = false;
    protected destroyed = false;

    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        void this.initialize();
    }

    protected async initialize(attempt = 0): Promise<void> {
        if (this.destroyed || this.editor) {
            return;
        }
        const element = this.elementRef?.nativeElement as HTMLTextAreaElement | undefined;
        if (!element || typeof element.tagName !== 'string') {
            return;
        }
        // Directives initialize before the host view is attached; CodeMirror
        // needs a parent node for its wrapper insertion.
        if (!element.parentNode && attempt < 20) {
            await Promise.resolve();
            return this.initialize(attempt + 1);
        }
        if (!element.parentNode) {
            return;
        }
        const language = element.getAttribute('data-dynamic-code')
            || element.getAttribute('workflow-code-editor');
        const suggestions = decodeSuggestions(element.getAttribute('data-code-suggestions'));
        const CodeMirrorApi = await loadCodeMirror(language);
        if (this.destroyed || !element.parentNode) {
            return;
        }
        const workflowHint = createWorkflowHint(CodeMirrorApi, suggestions);
        this.syncing = true;
        element.value = decodeValue(element.getAttribute('data-code-value')) || element.value || '';
        const editor = CodeMirrorApi.fromTextArea(element, {
            mode: modeFor(language),
            lineNumbers: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            tabSize: 2,
            indentUnit: 2,
            viewportMargin: Infinity,
            extraKeys: {
                'Ctrl-Space': (cm: any) => cm.showHint({ hint: workflowHint, completeSingle: false })
            }
        });
        // Directives are wrapped in a reactive proxy. Reading a stored editor
        // back through that proxy would wrap its DOM internals too and break
        // native measurements (`Illegal invocation`), so keep the raw instance.
        (editor as any)[noReact] = true;
        this.editor = editor;
        this.syncing = false;

        editor.on('change', () => {
            element.value = editor.getValue();
            const EventCtor = (element.ownerDocument as any)?.defaultView?.Event || Event;
            element.dispatchEvent(new EventCtor('input', { bubbles: true }));
        });
        // The inspector debounces code commits so typing does not rebuild the
        // whole designer on every keystroke. Blur is the explicit "commit now"
        // signal (clicking Run/Save/the menu all blur CodeMirror first).
        editor.on('blur', () => {
            const EventCtor = (element.ownerDocument as any)?.defaultView?.Event || Event;
            element.dispatchEvent(new EventCtor('blur'));
        });
        // Show workflow suggestions as soon as the user types a member access.
        editor.on('inputRead', (_cm: any, change: any) => {
            const text = (change?.text || []).join('');
            if (!text.endsWith('.')) {
                return;
            }
            setTimeout(() => {
                if (!this.destroyed && !(editor as any).state?.completionActive) {
                    (editor as any).showHint({ hint: workflowHint, completeSingle: false });
                }
            }, 0);
        });

        const Observer = (element.ownerDocument as any)?.defaultView?.MutationObserver
            || (globalThis as any).MutationObserver;
        if (typeof Observer === 'function') {
            const observer = new Observer((records: MutationRecord[]) => {
                if (this.syncing) {
                    return;
                }
                for (const record of records) {
                    if (record.attributeName !== 'data-code-value') {
                        continue;
                    }
                    const next = decodeValue(element.getAttribute('data-code-value'));
                    if (next !== editor.getValue()) {
                        this.syncing = true;
                        const cursor = editor.getCursor();
                        editor.setValue(next);
                        editor.setCursor(cursor);
                        this.syncing = false;
                    }
                }
            });
            (observer as any)[noReact] = true;
            this.observer = observer;
            observer.observe(element, { attributes: true, attributeFilter: ['data-code-value'] });
        }
    }

    onDestroy(): void {
        this.destroyed = true;
        this.observer?.disconnect();
        this.observer = undefined;
        if (this.editor) {
            this.editor.toTextArea();
            this.editor = undefined;
        }
    }
}
