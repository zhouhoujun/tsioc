import { Directive, ElementRef, OnDestroy, noReact } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { markElementRefRaw } from '@tsdi/components/common';
import { translateWorkflow } from '../src/visual/i18n';
import type { EditorView, ViewUpdate } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { CodeDiagnostic } from './code-editor-analysis';

type EditorLanguage = 'javascript' | 'json' | 'xml' | 'html' | 'htmlmixed' | 'css' | 'shell';

/**
 * Collapse the host's `data-dynamic-code` value into a known editor language.
 * The linter and hint lookups use this, so an unknown value must never make a
 * JSON/XML/CSS field look like JavaScript.
 */
function normalizeLanguage(language: string | null | undefined): EditorLanguage {
    switch (String(language || '').toLowerCase()) {
        case 'json':
            return 'json';
        case 'xml':
            return 'xml';
        case 'html':
            return 'html';
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
 * Load only the CodeMirror 6 language package needed by this field. Every
 * module is dynamically imported, so grammars stay in lazy chunks.
 */
async function loadLanguageSupport(language: EditorLanguage): Promise<any> {
    switch (language) {
        case 'json': {
            const module = await import('@codemirror/lang-json');
            return { kind: 'json', extension: module.json(), module };
        }
        case 'xml': {
            const module = await import('@codemirror/lang-xml');
            return { kind: 'xml', extension: module.xml(), module };
        }
        case 'html':
        case 'htmlmixed': {
            const module = await import('@codemirror/lang-html');
            return { kind: 'html', extension: module.html(), module };
        }
        case 'css': {
            const module = await import('@codemirror/lang-css');
            return { kind: 'css', extension: module.css(), module };
        }
        case 'shell': {
            const [legacy, languageApi] = await Promise.all([
                import('@codemirror/legacy-modes/mode/shell'),
                import('@codemirror/language')
            ]);
            return {
                kind: 'shell',
                extension: languageApi.StreamLanguage.define(legacy.shell),
                module: languageApi
            };
        }
        case 'javascript':
        default: {
            const module = await import('@codemirror/lang-javascript');
            return { kind: 'javascript', extension: module.javascript(), module };
        }
    }
}

/**
 * Load the shared CodeMirror 6 runtime. The editor assembles the equivalent of
 * `basicSetup` explicitly so the completion keymap can keep Enter for a newline
 * and use Tab to accept suggestions. Language packages and lint stay lazy.
 */
async function loadCodeMirror(language: EditorLanguage): Promise<any> {
    const [view, state, commands, languageApi, lint, autocomplete, search, highlight, languageSupport, completion] = await Promise.all([
        import('@codemirror/view'),
        import('@codemirror/state'),
        import('@codemirror/commands'),
        import('@codemirror/language'),
        import('@codemirror/lint'),
        import('@codemirror/autocomplete'),
        import('@codemirror/search'),
        import('@lezer/highlight'),
        loadLanguageSupport(language),
        import('./code-editor-runtime')
    ]);
    return { view, state, commands, languageApi, lint, autocomplete, search, highlight, languageSupport, completion };
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

export type { CodeDiagnostic, FunctionSyntaxError } from './code-editor-analysis';

/**
 * The analysis implementation lives in a lazy chunk so the designer's initial
 * bundle only carries the editor shell. These wrappers keep the public API and
 * the existing unit tests unchanged.
 */
export async function findFunctionSyntaxError(text: string) {
    const analysis = await import('./code-editor-analysis');
    return analysis.findFunctionSyntaxError(text);
}

export async function findJsonSyntaxError(text: string) {
    const analysis = await import('./code-editor-analysis');
    return analysis.findJsonSyntaxError(text);
}

export async function analyzeFunctionCode(text: string, translator?: Translator, options?: any) {
    const analysis = await import('./code-editor-analysis');
    return analysis.analyzeFunctionCode(text, translator, options);
}

export async function analyzeJsonCode(text: string, translator?: Translator) {
    const analysis = await import('./code-editor-analysis');
    return analysis.analyzeJsonCode(text, translator);
}

const EDITOR_HINT = 'Ctrl+Space: suggest · Tab: accept · Enter: newline';
const JSON_HINT = 'JSON · Ctrl+Space: suggest · Tab: accept · Enter: newline';
const ANYWORD_HINT = 'Ctrl+Space: suggest · Tab: accept · Enter: newline';

function editorHintFor(language: EditorLanguage, translator?: Translator): string {
    const locale = translator?.currentLocale || 'en';
    if (language === 'json') {
        return translateWorkflow(translator, locale, 'workflow.code.jsonHint', JSON_HINT);
    }
    return language === 'javascript'
        ? translateWorkflow(translator, locale, 'workflow.code.hint', EDITOR_HINT)
        : translateWorkflow(translator, locale, 'workflow.code.anywordHint', ANYWORD_HINT);
}

function isDarkTheme(element: HTMLElement): boolean {
    const designer = element.closest?.('.workflow-designer') as HTMLElement | null;
    const theme = designer?.getAttribute('data-theme')
        || element.ownerDocument?.documentElement?.getAttribute('data-theme')
        || 'light';
    return theme !== 'light';
}

function createEditorTheme(runtime: any, element: HTMLElement): Extension {
    const { EditorView } = runtime.view;
    const { syntaxHighlighting, HighlightStyle } = runtime.languageApi;
    const { tags } = runtime.highlight;
    const chrome = EditorView.theme({
        '&': {
            color: 'var(--wf-code-text, #0f172a)',
            backgroundColor: 'var(--wf-code-bg, #ffffff)',
            border: '1px solid var(--wf-code-border, #cbd5e1)',
            borderRadius: '6px',
            overflow: 'hidden',
            fontSize: '12px'
        },
        '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            lineHeight: '1.5',
            maxHeight: '460px',
            overflow: 'auto'
        },
        '.cm-content': {
            padding: '8px 0',
            caretColor: 'var(--wf-code-caret, #0f172a)'
        },
        '.cm-gutters': {
            backgroundColor: 'var(--wf-code-gutter, #f8fafc)',
            color: 'var(--wf-code-muted, #94a3b8)',
            borderRight: '1px solid var(--wf-code-border, #e2e8f0)'
        },
        '.cm-activeLine': {
            backgroundColor: 'var(--wf-code-active-line, rgba(37, 99, 235, 0.06))'
        },
        '.cm-activeLineGutter': {
            backgroundColor: 'var(--wf-code-active-gutter, rgba(37, 99, 235, 0.1))'
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
            backgroundColor: 'var(--wf-code-selection, rgba(37, 99, 235, 0.2))'
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: 'var(--wf-code-caret, #0f172a)'
        },
        '.cm-tooltip': {
            backgroundColor: 'var(--wf-code-tooltip-bg, #ffffff)',
            border: '1px solid var(--wf-code-border, #cbd5e1)',
            color: 'var(--wf-code-text, #0f172a)',
            borderRadius: '8px',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.2)'
        },
        '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            backgroundColor: 'var(--wf-code-accent, #2563eb)',
            color: '#ffffff'
        },
        '.cm-panels': {
            backgroundColor: 'var(--wf-code-gutter, #f8fafc)',
            color: 'var(--wf-code-text, #0f172a)'
        },
        '.cm-searchMatch': {
            backgroundColor: 'rgba(250, 204, 21, 0.35)'
        },
        '.cm-searchMatch.cm-searchMatch-selected': {
            backgroundColor: 'rgba(250, 204, 21, 0.6)'
        },
        '.cm-lintRange-error': {
            textDecoration: 'underline wavy var(--wf-code-danger, #dc2626)'
        },
        '.cm-lintRange-warning': {
            textDecoration: 'underline wavy var(--wf-code-warning, #d97706)'
        }
    }, { dark: isDarkTheme(element) });
    const highlight = syntaxHighlighting(HighlightStyle.define([
        { tag: tags.keyword, class: 'wf-code-keyword', color: 'var(--wf-code-keyword, #7c3aed)' },
        { tag: [tags.name, tags.variableName], class: 'wf-code-variable', color: 'var(--wf-code-text, #0f172a)' },
        { tag: [tags.propertyName, tags.attributeName], class: 'wf-code-property', color: 'var(--wf-code-property, #2563eb)' },
        { tag: [tags.function(tags.variableName), tags.labelName], class: 'wf-code-function', color: 'var(--wf-code-function, #0e7490)' },
        { tag: [tags.typeName, tags.className, tags.namespace], class: 'wf-code-type', color: 'var(--wf-code-type, #0e7490)' },
        { tag: [tags.string, tags.special(tags.string)], class: 'wf-code-string', color: 'var(--wf-code-string, #b91c1c)' },
        { tag: [tags.number, tags.bool, tags.null], class: 'wf-code-number', color: 'var(--wf-code-number, #0f766e)' },
        { tag: [tags.comment, tags.lineComment, tags.blockComment], class: 'wf-code-comment', color: 'var(--wf-code-comment, #94a3b8)', fontStyle: 'italic' },
        { tag: [tags.operator, tags.punctuation, tags.bracket], class: 'wf-code-operator', color: 'var(--wf-code-operator, #475569)' },
        { tag: [tags.meta, tags.annotation], class: 'wf-code-meta', color: 'var(--wf-code-meta, #64748b)' },
        { tag: tags.invalid, class: 'wf-code-invalid', color: 'var(--wf-code-danger, #dc2626)' }
    ]));
    return [chrome, highlight];
}

function docPosition(doc: any, line: number, ch: number): number {
    const lineNumber = Math.min(Math.max(0, line) + 1, doc.lines);
    const info = doc.line(lineNumber);
    return info.from + Math.min(Math.max(0, ch), info.length);
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
    protected view?: EditorView;
    protected container?: HTMLElement;
    protected observer?: MutationObserver;
    protected status?: HTMLElement;
    protected textarea?: HTMLTextAreaElement;
    protected previousDisplay = '';
    protected diagnosticsTimer?: ReturnType<typeof setTimeout>;
    protected diagnosticsRun = 0;
    protected diagnostics: CodeDiagnostic[] = [];
    protected completionNames: string[] = [];
    protected syncing = false;
    protected destroyed = false;
    protected lintApi?: any;
    protected completionRuntime?: any;
    protected language: EditorLanguage = 'javascript';
    protected statusHint = '';

    constructor(
        @Optional() protected elementRef?: ElementRef,
        @Optional() protected readonly translator?: Translator
    ) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        void this.initialize();
    }

    protected async initialize(attempt = 0): Promise<void> {
        if (this.destroyed || this.view) {
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
        const language = normalizeLanguage(
            element.getAttribute('data-dynamic-code')
            || element.getAttribute('workflow-code-editor')
        );
        const suggestions = decodeSuggestions(element.getAttribute('data-code-suggestions'));
        const runtime = await loadCodeMirror(language);
        if (this.destroyed || !element.parentNode) {
            return;
        }
        this.language = language;
        this.statusHint = editorHintFor(language, this.translator);
        this.lintApi = runtime.lint;
        this.completionRuntime = runtime.completion.createCompletionRuntime(runtime.autocomplete);
        this.completionNames = runtime.completion.collectCompletionNames(suggestions);
        this.textarea = element;
        this.previousDisplay = element.style.display;
        const initialValue = decodeValue(element.getAttribute('data-code-value')) || element.value || '';
        element.value = initialValue;
        element.style.display = 'none';

        const doc = element.ownerDocument;
        const host = doc.createElement('div');
        host.className = 'workflow-code-editor-host';
        element.parentNode.insertBefore(host, element.nextSibling);

        const status = doc.createElement('div');
        status.className = 'workflow-code-status';
        (status as any)[noReact] = true;
        status.textContent = this.statusHint;
        host.parentNode?.insertBefore(status, host.nextSibling);
        this.status = status;

        const scope = runtime.completion.buildCompletionScope(suggestions);
        const languageExtensions: Extension[] = [runtime.languageSupport.extension];
        if (runtime.languageSupport.kind === 'javascript') {
            const module = runtime.languageSupport.module;
            languageExtensions.push(module.javascriptLanguage.data.of({
                autocomplete: module.scopeCompletionSource(scope)
            }));
        } else {
            // JSON/XML/HTML/CSS/shell have no workflow-aware scope source, but
            // CodeMirror's dependency-free word source keeps Ctrl+Space useful.
            languageExtensions.push(runtime.state.EditorState.languageData.of(() => [{
                autocomplete: runtime.autocomplete.completeAnyWord
            }]));
        }
        const theme = createEditorTheme(runtime, element);
        const updateListener = runtime.view.EditorView.updateListener.of((update: ViewUpdate) => {
            this.handleUpdate(update);
        });
        const state = runtime.state.EditorState.create({
            doc: initialValue,
            extensions: [
                runtime.view.lineNumbers(),
                runtime.view.highlightActiveLineGutter(),
                runtime.view.highlightSpecialChars(),
                runtime.commands.history(),
                runtime.languageApi.foldGutter(),
                runtime.view.drawSelection(),
                runtime.view.dropCursor(),
                runtime.state.EditorState.allowMultipleSelections.of(true),
                runtime.languageApi.indentOnInput(),
                runtime.languageApi.syntaxHighlighting(runtime.languageApi.defaultHighlightStyle, { fallback: true }),
                runtime.languageApi.bracketMatching(),
                runtime.autocomplete.closeBrackets(),
                runtime.autocomplete.autocompletion({
                    // Completion is opened explicitly by `scheduleCompletion`
                    // below so member access and typed identifiers behave the
                    // same in every host (and Enter stays a newline).
                    activateOnTyping: false,
                    defaultKeymap: false,
                    closeOnBlur: true,
                    maxRenderedOptions: 40,
                    icons: true
                }),
                runtime.view.rectangularSelection(),
                runtime.view.crosshairCursor(),
                runtime.view.highlightActiveLine(),
                runtime.search.search({ top: true }),
                runtime.search.highlightSelectionMatches(),
                runtime.view.keymap.of([
                    ...runtime.autocomplete.closeBracketsKeymap,
                    ...runtime.commands.defaultKeymap,
                    ...runtime.search.searchKeymap,
                    ...runtime.commands.historyKeymap,
                    ...runtime.languageApi.foldKeymap,
                    { key: 'Ctrl-Space', run: runtime.autocomplete.startCompletion },
                    { key: 'Escape', run: runtime.autocomplete.closeCompletion },
                    { key: 'ArrowDown', run: runtime.autocomplete.moveCompletionSelection(true) },
                    { key: 'ArrowUp', run: runtime.autocomplete.moveCompletionSelection(false) },
                    { key: 'PageDown', run: runtime.autocomplete.moveCompletionSelection(true, 'page') },
                    { key: 'PageUp', run: runtime.autocomplete.moveCompletionSelection(false, 'page') },
                    { key: 'Tab', run: runtime.autocomplete.acceptCompletion },
                    runtime.commands.indentWithTab,
                    ...runtime.lint.lintKeymap
                ]),
                ...languageExtensions,
                runtime.lint.lintGutter(),
                theme,
                updateListener
            ]
        });
        const view = new runtime.view.EditorView({ state, parent: host });
        (view as any)[noReact] = true;
        this.view = view;
        this.container = host;

        this.observeExternalValue(element, view);
        this.scheduleDiagnostics(80);
    }

    protected handleUpdate(update: ViewUpdate): void {
        if (this.destroyed) {
            return;
        }
        if (update.docChanged) {
            const element = this.textarea;
            const value = update.state.doc.toString();
            if (element && element.value !== value) {
                element.value = value;
                const EventCtor = (element.ownerDocument as any)?.defaultView?.Event || Event;
                element.dispatchEvent(new EventCtor('input', { bubbles: true }));
            }
            this.scheduleDiagnostics();
            this.completionRuntime?.schedule(update);
        }
        if (update.focusChanged && !update.view.hasFocus) {
            this.completionRuntime?.cancel();
            const element = this.textarea;
            const EventCtor = (element?.ownerDocument as any)?.defaultView?.Event || Event;
            element?.dispatchEvent(new EventCtor('blur'));
        }
    }

    protected observeExternalValue(element: HTMLTextAreaElement, view: EditorView): void {
        const Observer = (element.ownerDocument as any)?.defaultView?.MutationObserver
            || (globalThis as any).MutationObserver;
        if (typeof Observer !== 'function') {
            return;
        }
        const observer = new Observer((records: MutationRecord[]) => {
            if (this.syncing || this.destroyed || !this.view) {
                return;
            }
            for (const record of records) {
                if (record.attributeName !== 'data-code-value') {
                    continue;
                }
                const next = decodeValue(element.getAttribute('data-code-value'));
                if (next === this.view.state.doc.toString()) {
                    continue;
                }
                const { anchor, head } = this.view.state.selection.main;
                this.syncing = true;
                this.view.dispatch({
                    changes: { from: 0, to: this.view.state.doc.length, insert: next },
                    selection: {
                        anchor: Math.min(anchor, next.length),
                        head: Math.min(head, next.length)
                    }
                });
                this.syncing = false;
                this.scheduleDiagnostics();
            }
        });
        (observer as any)[noReact] = true;
        this.observer = observer;
        observer.observe(element, { attributes: true, attributeFilter: ['data-code-value'] });
    }

    protected scheduleDiagnostics(delay = 320): void {
        if (this.diagnosticsTimer) {
            clearTimeout(this.diagnosticsTimer);
        }
        this.diagnosticsTimer = setTimeout(() => {
            this.diagnosticsTimer = undefined;
            void this.runDiagnostics();
        }, delay);
    }

    protected async runDiagnostics(): Promise<void> {
        if (this.destroyed || !this.view) {
            return;
        }
        const run = ++this.diagnosticsRun;
        const view = this.view;
        const text = view.state.doc.toString();
        const diagnostics = this.language === 'json'
            ? await analyzeJsonCode(text, this.translator)
            : await analyzeFunctionCode(text, this.translator, {
                cursorOffset: view.state.selection.main.head,
                knownNames: this.completionNames
            });
        if (this.destroyed || run !== this.diagnosticsRun || this.view !== view) {
            return;
        }
        const doc = view.state.doc;
        const mapped = diagnostics.map(diagnostic => {
            const from = docPosition(doc, diagnostic.line, diagnostic.ch);
            const to = Math.max(from, docPosition(doc, diagnostic.endLine, diagnostic.endCh));
            return {
                from,
                to,
                severity: diagnostic.severity,
                message: diagnostic.message
            };
        });
        if (this.lintApi?.setDiagnostics) {
            view.dispatch(this.lintApi.setDiagnostics(view.state, mapped));
        }
        this.updateStatus(diagnostics);
    }

    protected updateStatus(diagnostics: CodeDiagnostic[]): void {
        const status = this.status;
        if (!status) {
            return;
        }
        const error = diagnostics.find(item => item.severity === 'error');
        const warning = diagnostics.find(item => item.severity === 'warning');
        const primary = error || warning;
        if (!primary) {
            status.textContent = this.statusHint;
            status.classList.remove('is-error', 'is-warning');
            return;
        }
        const extra = diagnostics.length > 1 ? ` (+${diagnostics.length - 1})` : '';
        status.textContent = `${error ? '⚠' : '△'} ${primary.message} (${primary.line + 1}:${primary.ch + 1})${extra}`;
        status.classList.toggle('is-error', !!error);
        status.classList.toggle('is-warning', !error && !!warning);
    }

    onDestroy(): void {
        this.destroyed = true;
        if (this.diagnosticsTimer) {
            clearTimeout(this.diagnosticsTimer);
            this.diagnosticsTimer = undefined;
        }
        this.completionRuntime?.dispose();
        this.completionRuntime = undefined;
        this.observer?.disconnect();
        this.observer = undefined;
        this.view?.destroy();
        this.view = undefined;
        this.container?.remove();
        this.container = undefined;
        this.status?.remove();
        this.status = undefined;
        if (this.textarea) {
            this.textarea.style.display = this.previousDisplay;
            this.textarea = undefined;
        }
    }
}
