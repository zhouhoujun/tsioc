import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    BrowserWindowLike,
    CloseEventLike,
    DesktopApp,
    DesktopAppOptions,
    DesktopPaths,
    DisposableLike,
    ElectronHost,
    FileSystemLike,
    MenuItemLike,
    MenuLike,
    TrayLike
} from '../src';

class Disposable implements DisposableLike {
    constructor(private readonly fn: () => void = () => undefined) {}
    dispose() { this.fn(); }
}

interface FixtureWindow extends BrowserWindowLike {
    loads: string[];
    shown: number;
    hidden: number;
    closed: boolean;
    visible: boolean;
    closeListeners: Array<(event: CloseEventLike) => void>;
    closedListeners: Array<() => void>;
}

interface FixtureTray extends TrayLike {
    tooltip: string;
    menu: MenuItemLike[];
    disposed: boolean;
}

interface Fixture {
    host: ElectronHost;
    fs: FileSystemLike;
    options: DesktopAppOptions;
    paths: DesktopPaths;
    writtenFiles: Map<string, string>;
    windows: FixtureWindow[];
    trays: FixtureTray[];
    appQuit: () => void;
    singleInstanceResult: boolean;
    lockData?: Record<string, unknown>;
    secondInstance?: (event: unknown, argv: string[], cwd: string, data?: Record<string, unknown>) => void;
}

function createFixture(overrides: Partial<DesktopAppOptions> = {}): Fixture {
    const writtenFiles = new Map<string, string>();
    const windows: FixtureWindow[] = [];
    const trays: FixtureTray[] = [];
    let appQuitCalled = false;
    const fixture: Fixture = {
        fs: {
            writeTextFile(filePath, content) { writtenFiles.set(filePath, content); },
            joinPath: (...parts) => parts.join('/'),
            dirname: filePath => filePath.split('/').slice(0, -1).join('/'),
            toFileUrl: filePath => `file://${filePath}`
        },
        writtenFiles,
        windows,
        trays,
        appQuit: () => { appQuitCalled = true; },
        singleInstanceResult: true,
        options: {
            title: 'TSDI Agent',
            gatewayUrl: 'http://127.0.0.1:3000',
            token: 'tok-1',
            sessionId: 'sess-1',
            workspace: '/ws/proj',
            width: 1200,
            height: 800,
            tray: true,
            closeToTray: true,
            startHidden: false,
            quitOnAllClosed: true,
            singleInstance: true,
            ...overrides
        },
        paths: {
            scriptUri: 'file:///app/resources/agent-console.js',
            htmlPath: '/data/console.html'
        },
        host: {
            app: {
                whenReady: async () => undefined,
                quit: () => { appQuitCalled = true; },
                getPath: name => `/data/${name}`,
                requestSingleInstanceLock: data => { fixture.lockData = data; return fixture.singleInstanceResult; },
                on: (event: string, listener: any) => {
                    if (event === 'second-instance') fixture.secondInstance = listener;
                    return new Disposable();
                }
            },
            BrowserWindow: class implements FixtureWindow {
                loads: string[] = [];
                shown = 0;
                hidden = 0;
                closed = false;
                visible = true;
                closeListeners: Array<(event: CloseEventLike) => void> = [];
                closedListeners: Array<() => void> = [];
                webContents = { reload: () => undefined };
                constructor(options?: unknown) {
                    windows.push(this);
                    const show = (options as { show?: boolean } | undefined)?.show ?? true;
                    this.visible = show;
                }
                loadFile(filePath: string) { this.loads.push(filePath); return Promise.resolve(); }
                show() { this.shown++; this.visible = true; }
                hide() { this.hidden++; this.visible = false; }
                close() { this.closed = true; }
                isVisible() { return this.visible; }
                isDestroyed() { return this.closed; }
                setTitle() { undefined; }
                on(event: 'close' | 'closed', listener: unknown) {
                    if (event === 'close') { this.closeListeners.push(listener as (e: CloseEventLike) => void); }
                    else { this.closedListeners.push(listener as () => void); }
                    return this;
                }
                dispose() { this.closed = true; }
            } as unknown as ElectronHost['BrowserWindow'],
            Tray: class implements FixtureTray {
                tooltip = '';
                menu: MenuItemLike[] = [];
                disposed = false;
                clickListener: (() => void) | null = null;
                constructor() { trays.push(this); }
                setToolTip(tooltip: string) { this.tooltip = tooltip; }
                setContextMenu(menu: MenuLike) { this.menu = (menu as unknown as { template: MenuItemLike[] }).template ?? []; }
                on(event: 'click', listener: () => void) { this.clickListener = listener; return this; }
                dispose() { this.disposed = true; }
            } as unknown as ElectronHost['Tray'],
            Menu: {
                buildFromTemplate: (template: MenuItemLike[]) => ({ popup: () => undefined, template })
            },
            nativeImage: {
                createEmpty: () => ({}),
                createFromDataURL: dataUrl => ({ dataUrl })
            }
        }
    };
    return fixture;
}

@Suite('Agent desktop app lifecycle')
export class AgentDesktopAppTest {
    @Test('start opens a window and a tray with show/refresh/quit menu')
    async startCreatesWindowAndTray() {
        const fixture = createFixture();
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        expect(fixture.windows.length).toEqual(1);
        expect(fixture.windows[0].loads).toEqual(['/data/console.html']);
        expect(fixture.trays.length).toEqual(1);
        expect(fixture.trays[0].tooltip).toEqual('TSDI Agent');
        expect(fixture.trays[0].menu.map(item => item.label)).toEqual(['Hide Console', 'Refresh', undefined, 'Quit']);
    }

    @Test('writes host html with injected gateway config and sandboxed webPreferences')
    async hostHtmlAndSandbox() {
        const fixture = createFixture();
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        const html = fixture.writtenFiles.get('/data/console.html') ?? '';
        expect(html).toContain('"baseUrl":"http://127.0.0.1:3000"');
        expect(html).toContain('"token":"tok-1"');
        expect(html).toContain('"sessionId":"sess-1"');
        expect(html).toContain('"workspace":"/ws/proj"');
        expect(html).toContain('src="file:///app/resources/agent-console.js"');
        expect(html).toContain('connect-src http: https:');
    }

    @Test('startHidden keeps the window hidden until toggled')
    async startHidden() {
        const fixture = createFixture({ startHidden: true });
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        expect(fixture.windows[0].shown).toEqual(0);
        app.toggleWindow();
        expect(fixture.windows[0].shown).toEqual(1);
        app.toggleWindow();
        expect(fixture.windows[0].hidden).toEqual(1);
    }

    @Test('close with closeToTray hides instead of destroying the window')
    async closeToTray() {
        const fixture = createFixture({ closeToTray: true });
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        const win = fixture.windows[0];
        let prevented = false;
        win.closeListeners[0]({ preventDefault: () => { prevented = true; } });
        expect(prevented).toEqual(true);
        expect(win.closed).toEqual(false);
        expect(win.visible).toEqual(false);
    }

    @Test('quit closes the window, disposes the tray and quits the app')
    async quit() {
        const fixture = createFixture();
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        let quitCalled = false;
        fixture.host.app.quit = () => { quitCalled = true; };
        app.quit();
        expect(fixture.windows[0].closed).toEqual(true);
        expect(fixture.trays[0].disposed).toEqual(true);
        expect(quitCalled).toEqual(true);
    }

    @Test('refresh reloads the webContents of the live window')
    async refresh() {
        const fixture = createFixture();
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        let reloaded = 0;
        fixture.windows[0].webContents.reload = () => { reloaded++; };
        app.refresh();
        expect(reloaded).toEqual(1);
    }

    @Test('single instance lock failure quits without opening a window')
    async singleInstanceDenied() {
        const fixture = createFixture();
        fixture.singleInstanceResult = false;
        let quitCalled = false;
        fixture.host.app.quit = () => { quitCalled = true; };
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        expect(quitCalled).toEqual(true);
        expect(fixture.windows.length).toEqual(0);
    }

    @Test('single instance handoff reloads and shows the requested session')
    async secondInstanceHandoff() {
        const fixture = createFixture();
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        expect(fixture.lockData).toEqual({ gatewayUrl: 'http://127.0.0.1:3000', token: 'tok-1', sessionId: 'sess-1', workspace: '/ws/proj' });
        fixture.secondInstance?.({}, [], '/tmp', {
            gatewayUrl: 'https://gateway.example/', token: 'tok-2', sessionId: 'sess-2', workspace: '/ws/next'
        });
        const html = fixture.writtenFiles.get('/data/console.html') ?? '';
        expect(html).toContain('"baseUrl":"https://gateway.example"');
        expect(html).toContain('"token":"tok-2"');
        expect(html).toContain('"sessionId":"sess-2"');
        expect(html).toContain('"workspace":"/ws/next"');
        expect(fixture.windows[0].loads).toEqual(['/data/console.html', '/data/console.html']);
        expect(fixture.windows[0].shown).toEqual(1);
    }

    @Test('tray disabled skips tray creation')
    async trayDisabled() {
        const fixture = createFixture({ tray: false });
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        expect(fixture.trays.length).toEqual(0);
        expect(fixture.windows.length).toEqual(1);
    }

    @Test('createWindow reuses a live window and shows it')
    async windowReuse() {
        const fixture = createFixture();
        const app = new DesktopApp(fixture.host, fixture.fs, fixture.options, fixture.paths);
        await app.start();
        const before = fixture.windows.length;
        app.createWindow();
        expect(fixture.windows.length).toEqual(before);
        expect(fixture.windows[0].shown).toEqual(1);
    }
}
