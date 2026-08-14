import { buildDesktopHtml } from './desktop-html';
import { DesktopAppOptions } from './config';
import { BrowserWindowLike, DisposableLike, ElectronHost, FileSystemLike, MenuItemLike, TrayLike } from './host';
import { normalizeGatewayUrl } from './desktop-html';

export interface DesktopHandoff {
    gatewayUrl?: string;
    token?: string;
    sessionId?: string;
    workspace?: string;
}

export interface DesktopPaths {
    /** file:// URI of the bundled web console script (agent-console.js) */
    scriptUri: string;
    /** Absolute path where the generated console.html is written and loaded */
    htmlPath: string;
}

/** 1x1 transparent PNG, base64 — tray fallback icon when no themed icon is available */
export const TRAY_ICON_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export class DesktopApp {
    private window: BrowserWindowLike | null = null;
    private tray: TrayLike | null = null;
    private quitting = false;

    constructor(
        private readonly electron: ElectronHost,
        private readonly fs: FileSystemLike,
        private readonly options: DesktopAppOptions,
        private readonly paths: DesktopPaths
    ) {}

    async start(): Promise<void> {
        await this.electron.app.whenReady();
        if (this.options.singleInstance) {
            this.electron.app.on('second-instance', (_event, _argv, _cwd, data) => this.applyHandoff(data as DesktopHandoff));
        }
        if (this.options.singleInstance && !this.electron.app.requestSingleInstanceLock({ ...this.currentHandoff() })) {
            this.electron.app.quit();
            return;
        }
        this.createWindow();
        if (this.options.tray) {
            this.createTray();
        }
        if (this.options.quitOnAllClosed) {
            this.electron.app.on('window-all-closed', () => this.electron.app.quit());
        }
    }

    applyHandoff(handoff?: DesktopHandoff): void {
        if (!handoff || typeof handoff !== 'object') return;
        if (handoff.gatewayUrl) this.options.gatewayUrl = normalizeGatewayUrl(String(handoff.gatewayUrl));
        if (typeof handoff.token === 'string') this.options.token = handoff.token;
        if (typeof handoff.sessionId === 'string') this.options.sessionId = handoff.sessionId;
        if (typeof handoff.workspace === 'string') this.options.workspace = handoff.workspace;
        if (this.window && !this.window.isDestroyed()) {
            this.writeHostHtml();
            void this.window.loadFile(this.paths.htmlPath);
            this.window.show();
        } else {
            this.createWindow();
        }
    }

    private currentHandoff(): DesktopHandoff {
        return { gatewayUrl: this.options.gatewayUrl, token: this.options.token, sessionId: this.options.sessionId, workspace: this.options.workspace };
    }

    private writeHostHtml(): void {
        const html = buildDesktopHtml({
            scriptUri: this.paths.scriptUri,
            baseUrl: this.options.gatewayUrl,
            token: this.options.token,
            sessionId: this.options.sessionId || undefined,
            workspace: this.options.workspace || undefined,
            nonce: createNonce(),
            title: this.options.title
        });
        this.fs.writeTextFile(this.paths.htmlPath, html);
    }

    createWindow(): BrowserWindowLike | null {
        if (this.window && !this.window.isDestroyed()) {
            this.window.show();
            return this.window;
        }
        try {
            this.writeHostHtml();
            const win = new this.electron.BrowserWindow({
                width: this.options.width,
                height: this.options.height,
                title: this.options.title,
                show: !this.options.startHidden,
                webPreferences: {
                    contextIsolation: true,
                    nodeIntegration: false,
                    sandbox: true
                }
            });
            win.on('close', event => {
                if (this.options.closeToTray && !this.quitting) {
                    event.preventDefault();
                    win.hide();
                }
            });
            win.on('closed', () => {
                this.window = null;
            });
            win.loadFile(this.paths.htmlPath);
            this.window = win;
            return win;
        } catch (error) {
            throw new Error(`TSDI Agent desktop window failed to open: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    toggleWindow(): void {
        if (!this.window || this.window.isDestroyed()) {
            this.createWindow();
            return;
        }
        if (this.window.isVisible()) {
            this.window.hide();
        } else {
            this.window.show();
        }
    }

    refresh(): void {
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.reload();
        }
    }

    quit(): void {
        this.quitting = true;
        this.tray?.dispose();
        this.tray = null;
        if (this.window && !this.window.isDestroyed()) {
            this.window.close();
        }
        this.window = null;
        this.electron.app.quit();
    }

    createTray(): TrayLike | null {
        if (this.tray) {
            return this.tray;
        }
        try {
            const icon = this.electron.nativeImage.createFromDataURL(TRAY_ICON_DATA_URL);
            const tray = new this.electron.Tray(icon);
            tray.setToolTip(this.options.title);
            tray.setContextMenu(this.electron.Menu.buildFromTemplate(this.buildTrayMenu()));
            tray.on('click', () => this.toggleWindow());
            this.tray = tray;
            return tray;
        } catch (error) {
            throw new Error(`TSDI Agent tray failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private buildTrayMenu(): MenuItemLike[] {
        const items: MenuItemLike[] = [
            {
                label: this.window && this.window.isVisible() && !this.window.isDestroyed() ? 'Hide Console' : 'Show Console',
                click: () => this.toggleWindow()
            },
            { label: 'Refresh', click: () => this.refresh() },
            { type: 'separator' },
            { label: 'Quit', click: () => this.quit() }
        ];
        return items;
    }
}

function createNonce(): string {
    let value = '';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        value += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return value;
}
