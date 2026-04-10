declare module 'puppeteer' {
    export interface Page {
        goto(url: string, options?: { timeout?: number; waitUntil?: string }): Promise<void>;
        evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
        evaluate<T, A>(fn: (a: A) => T | Promise<T>, arg: A): Promise<T>;
        exposeFunction(name: string, fn: (...args: any[]) => any): Promise<void>;
        setViewport(viewport: { width: number; height: number }): Promise<void>;
        waitForSelector(selector: string, options?: { timeout?: number }): Promise<void>;
        waitForFunction(fn: () => boolean, options?: { timeout?: number }): Promise<void>;
        screenshot(options?: { path?: string; type?: 'png' | 'jpeg' }): Promise<Buffer>;
        on(event: 'console', handler: (msg: any) => void): void;
        on(event: 'pageerror', handler: (error: Error) => void): void;
        close(): Promise<void>;
    }
    export interface BrowserContext {
        newPage(): Promise<Page>;
        close(): Promise<void>;
    }
    export interface Browser {
        newIncognitoBrowserContext(): Promise<BrowserContext>;
        pages(): Promise<Page[]>;
        close(): Promise<void>;
        isConnected(): boolean;
    }
    export function launch(options: {
        headless?: boolean;
        args?: string[];
        defaultViewport?: { width: number; height: number };
        timeout?: number;
        executablePath?: string;
        devtools?: boolean;
    }): Promise<Browser>;
}

declare module 'jsdom' {
    export interface JSDOM {
        window: any;
    }
    export class JSDOM {
        constructor(html: string, options?: {
            runScripts?: string;
            resources?: string;
            pretendToBeVisual?: boolean;
            url?: string;
        });
    }
}