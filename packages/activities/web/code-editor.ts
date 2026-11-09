import { Directive, ElementRef, OnDestroy, noReact } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '@tsdi/components/common';
import CodeMirror = require('codemirror');

import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/css/css';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/shell/shell';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';

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
 * Progressive-enhancement code editor for `[workflow-code-editor]` textareas.
 *
 * The generic inspector renders a plain textarea; HTML hosts that import
 * `WorkflowCodeEditorModule` get CodeMirror (MIT) on top without coupling the
 * renderer-neutral inspector to a browser editor implementation.
 */
@Directive({ selector: '[workflow-code-editor]' })
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
        const language = element.getAttribute('workflow-code-editor');
        this.syncing = true;
        element.value = decodeValue(element.getAttribute('data-code-value')) || element.value || '';
        const editor = CodeMirror.fromTextArea(element, {
            mode: modeFor(language) as any,
            lineNumbers: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            tabSize: 2,
            indentUnit: 2,
            viewportMargin: Infinity
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
