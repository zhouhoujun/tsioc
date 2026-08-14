import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { activateWithHost, AgentConsolePanel, DisposableLike, ExtensionContextLike, VsCodeHost, WebviewPanelLike } from '../src';

class Disposable implements DisposableLike {
    constructor(private readonly fn: () => void = () => undefined) {}
    dispose() { this.fn(); }
}

function createFixture(overrides: Record<string, string> = {}) {
    const commands = new Map<string, () => unknown>();
    const configListeners: Array<(event: { affectsConfiguration(section: string): boolean }) => unknown> = [];
    const panels: Array<WebviewPanelLike & { reveals: number; disposed: boolean }> = [];
    const errors: string[] = [];
    const posted: unknown[] = [];
    const config = {
        gatewayUrl: 'http://127.0.0.1:3000',
        token: 'token-1',
        sessionId: 'session-1',
        ...overrides
    };
    const host: VsCodeHost = {
        ViewColumn: { Beside: 2 },
        Uri: { joinPath: (_base, ...paths) => {
            const path = paths.join('/');
            return { path, toString: () => path };
        } },
        commands: {
            registerCommand(command, handler) {
                commands.set(command, handler);
                return new Disposable(() => commands.delete(command));
            }
        },
        window: {
            activeTextEditor: undefined,
            createWebviewPanel(_viewType, _title, _column, _options) {
                let disposeListener: () => unknown = () => undefined;
                const panel: WebviewPanelLike & { reveals: number; disposed: boolean } = {
                    reveals: 0,
                    disposed: false,
                    webview: {
                        html: '',
                        cspSource: 'vscode-webview:',
                        asWebviewUri: uri => ({ toString: () => `webview:${(uri as any).path}` }),
                        postMessage: message => { posted.push(message); return Promise.resolve(true); }
                    },
                    reveal() { panel.reveals++; },
                    onDidDispose(listener) { disposeListener = listener; return new Disposable(); },
                    onDidReceiveMessage() { return new Disposable(); },
                    dispose() { panel.disposed = true; disposeListener(); }
                };
                panels.push(panel);
                return panel;
            },
            showErrorMessage(message) { errors.push(message); },
            onDidChangeActiveTextEditor() { return new Disposable(); }
        },
        workspace: {
            workspaceFolders: [{ uri: { fsPath: '/workspace/project' } }],
            getConfiguration: () => ({
                get<T>(key: string, fallback: T): T {
                    return (config as Record<string, unknown>)[key] as T ?? fallback;
                }
            }),
            onDidChangeConfiguration(listener) { configListeners.push(listener); return new Disposable(); }
        }
    };
    const context: ExtensionContextLike = { extensionUri: { path: '/extension' }, subscriptions: [] };
    return { host, context, commands, configListeners, panels, errors, posted };
}

@Suite('Agent VS Code extension host')
export class AgentVscodeExtensionTest {
    @Test('opens one webview panel and reuses it on subsequent commands')
    opensAndReuses() {
        const fixture = createFixture();
        const controller = new AgentConsolePanel(fixture.host, fixture.context);
        const first = controller.open();
        const second = controller.open();
        expect(first).toBe(second);
        expect(fixture.panels.length).toEqual(1);
        expect(fixture.panels[0].reveals).toEqual(1);
        expect(fixture.panels[0].webview.html).toContain('"workspace":"/workspace/project"');
        expect(fixture.panels[0].webview.html).toContain('"sessionId":"session-1"');
    }

    @Test('recreates the panel after disposal and reports invalid config')
    disposalAndInvalidConfig() {
        const fixture = createFixture();
        const controller = new AgentConsolePanel(fixture.host, fixture.context);
        controller.open()?.dispose();
        controller.open();
        expect(fixture.panels.length).toEqual(2);

        const invalid = createFixture({ gatewayUrl: 'ftp://gateway.example' });
        const result = new AgentConsolePanel(invalid.host, invalid.context).open();
        expect(result).toBe(null);
        expect(invalid.errors[0]).toContain('http:// or https://');
    }

    @Test('posts IDE context on open and reacts to active editor changes')
    postsIdeContext() {
        const fixture = createFixture();
        const editorListeners: Array<(editor: unknown) => unknown> = [];
        const host = fixture.host as VsCodeHost & { window: any };
        host.window.activeTextEditor = {
            document: { fileName: '/workspace/project/src/main.ts' },
            selection: { start: { line: 3 }, end: { line: 8 } }
        };
        host.window.onDidChangeActiveTextEditor = (listener: (editor: unknown) => unknown) => {
            editorListeners.push(listener);
            return new Disposable();
        };
        const controller = new AgentConsolePanel(host, fixture.context);
        controller.open();
        expect(fixture.posted.length).toEqual(1);
        expect(fixture.posted[0]).toEqual({
            type: 'tsdiAgent.ideContext',
            activeFile: '/workspace/project/src/main.ts',
            selection: { startLine: 4, endLine: 9 }
        });
        editorListeners[0]({ document: { fileName: '/workspace/project/src/lib.ts' }, selection: { start: { line: 0 }, end: { line: 0 } } });
        expect(fixture.posted.length).toEqual(2);
        expect((fixture.posted[1] as any).activeFile).toEqual('/workspace/project/src/lib.ts');
    }

    @Test('activation registers open refresh and configuration refresh')
    activation() {
        const fixture = createFixture();
        activateWithHost(fixture.context, fixture.host);
        expect(Array.from(fixture.commands.keys())).toEqual([
            'tsdiAgent.openConsole',
            'tsdiAgent.refreshConsole'
        ]);
        fixture.commands.get('tsdiAgent.openConsole')?.();
        fixture.commands.get('tsdiAgent.refreshConsole')?.();
        expect(fixture.panels.length).toEqual(2);
        fixture.configListeners[0]({ affectsConfiguration: section => section === 'tsdiAgent' });
        expect(fixture.panels.length).toEqual(3);
        expect(fixture.context.subscriptions.length).toEqual(4);
    }
}
