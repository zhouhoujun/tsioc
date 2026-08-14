/**
 * Injectable Electron host abstraction for `@tsdi/agent-desktop`.
 *
 * Every Electron API the desktop shell touches is described here as a minimal
 * structural interface. `main.ts` wires the real `require('electron')` module
 * onto these shapes; tests build fixture hosts so all window/tray/lifecycle
 * logic runs without Electron installed.
 */

export interface DisposableLike {
    dispose(): unknown;
}

export interface CloseEventLike {
    preventDefault(): void;
}

export interface BrowserWindowLike extends DisposableLike {
    loadFile(path: string): Promise<unknown>;
    show(): void;
    hide(): void;
    close(): void;
    isVisible(): boolean;
    isDestroyed(): boolean;
    setTitle(title: string): void;
    on(event: 'close', listener: (event: CloseEventLike) => void): this;
    on(event: 'closed', listener: () => void): this;
    webContents: {
        reload(): void;
    };
}

export interface MenuItemLike {
    label?: string;
    type?: 'normal' | 'separator';
    click?: () => void;
}

export interface MenuLike {
    popup(): void;
}

export interface TrayLike extends DisposableLike {
    setToolTip(tooltip: string): void;
    setContextMenu(menu: MenuLike): void;
    on(event: 'click', listener: () => void): this;
}

export interface AppLike {
    whenReady(): Promise<unknown>;
    quit(): void;
    getPath(name: string): string;
    requestSingleInstanceLock(additionalData?: Record<string, unknown>): boolean;
    on(event: 'window-all-closed', listener: () => void): DisposableLike;
    on(event: 'second-instance', listener: (event: unknown, argv: string[], workingDirectory: string, additionalData?: Record<string, unknown>) => void): DisposableLike;
}

export interface FileSystemLike {
    writeTextFile(path: string, content: string): void;
    joinPath(...parts: string[]): string;
    dirname(path: string): string;
    /** Converts an absolute path to a file:// URI (pathToFileURL semantics) */
    toFileUrl(path: string): string;
}

export interface ElectronHost {
    app: AppLike;
    BrowserWindow: new (options: unknown) => BrowserWindowLike;
    Tray: new (icon: unknown) => TrayLike;
    Menu: {
        buildFromTemplate(template: MenuItemLike[]): MenuLike;
    };
    nativeImage: {
        createEmpty(): unknown;
        createFromDataURL(dataUrl: string): unknown;
    };
}
