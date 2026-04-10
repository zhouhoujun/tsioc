import { Injectable } from '@tsdi/ioc';

/**
 * Browser launcher options.
 * 浏览器启动器选项
 */
export interface BrowserLauncherOptions {
    /**
     * Browser type: 'chrome' for ChromeHeadless, 'jsdom' for jsdom simulation.
     * 浏览器类型：'chrome' 使用 ChromeHeadless，'jsdom' 使用 jsdom 模拟
     */
    browser?: 'chrome' | 'jsdom';
    /**
     * Headless mode (for Chrome).
     * 无头模式（用于 Chrome）
     */
    headless?: boolean;
    /**
     * Viewport width.
     * 视口宽度
     */
    width?: number;
    /**
     * Viewport height.
     * 视口高度
     */
    height?: number;
    /**
     * Browser timeout in milliseconds.
     * 浏览器超时时间（毫秒）
     */
    timeout?: number;
    /**
     * Enable debugging.
     * 启用调试模式
     */
    debug?: boolean;
    /**
     * Devtools port (for Chrome).
     * DevTools 端口（用于 Chrome）
     */
    devtoolsPort?: number;
    /**
     * Chrome executable path (optional).
     * Chrome 可执行文件路径（可选）
     */
    executablePath?: string;
    /**
     * Browser arguments.
     * 浏览器启动参数
     */
    args?: string[];
    /**
     * Ignore HTTP errors.
     * 忽略 HTTP 错误
     */
    ignoreHTTPSErrors?: boolean;
}

/**
 * Browser page interface.
 * 浏览器页面接口
 */
export interface BrowserPage {
    /**
     * Navigate to URL.
     * 导航到 URL
     */
    goto(url: string, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' }): Promise<void>;
    /**
     * Evaluate script in browser context.
     * 在浏览器上下文中执行脚本
     */
    evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
    /**
     * Expose function to browser.
     * 将函数暴露给浏览器
     */
    exposeFunction(name: string, fn: (...args: any[]) => any): Promise<void>;
    /**
     * Set viewport.
     * 设置视口
     */
    setViewport(viewport: { width: number; height: number }): Promise<void>;
    /**
     * Wait for selector.
     * 等待选择器
     */
    waitForSelector(selector: string, options?: { timeout?: number }): Promise<void>;
    /**
     * Wait for function.
     * 等待函数
     */
    waitForFunction(fn: () => boolean, options?: { timeout?: number }): Promise<void>;
    /**
     * Screenshot.
     * 截图
     */
    screenshot(options?: { path?: string; type?: 'png' | 'jpeg' }): Promise<Buffer>;
    /**
     * Get console messages.
     * 获取控制台消息
     */
    on(event: 'console', handler: (msg: any) => void): void;
    /**
     * Get page errors.
     * 获取页面错误
     */
    on(event: 'pageerror', handler: (error: Error) => void): void;
    /**
     * Close page.
     * 关闭页面
     */
    close(): Promise<void>;
}

/**
 * Browser context interface.
 * 浏览器上下文接口
 */
export interface BrowserContext {
    /**
     * Create new page.
     * 创建新页面
     */
    newPage(): Promise<BrowserPage>;
    /**
     * Close context.
     * 关闭上下文
     */
    close(): Promise<void>;
}

/**
 * Browser instance interface.
 * 浏览器实例接口
 */
export interface BrowserInstance {
    /**
     * Create new context.
     * 创建新上下文
     */
    newContext(): Promise<BrowserContext>;
    /**
     * Get pages.
     * 获取页面列表
     */
    pages(): Promise<BrowserPage[]>;
    /**
     * Close browser.
     * 关闭浏览器
     */
    close(): Promise<void>;
    /**
     * Check if connected.
     * 检查是否已连接
     */
    isConnected(): boolean;
}

/**
 * Browser launcher - abstract interface for launching browsers.
 * 浏览器启动器 - 启动浏览器的抽象接口
 */
@Injectable()
export abstract class BrowserLauncher {
    /**
     * Launch browser instance.
     * 启动浏览器实例
     */
    abstract launch(options?: BrowserLauncherOptions): Promise<BrowserInstance>;
    /**
     * Check if browser type is available.
     * 检查浏览器类型是否可用
     */
    abstract isAvailable(): Promise<boolean>;
    /**
     * Get browser name.
     * 获取浏览器名称
     */
    abstract get name(): string;
}

/**
 * Chrome Headless browser launcher using puppeteer.
 * 使用 puppeteer 的 Chrome 无头浏览器启动器
 */
@Injectable()
export class ChromeLauncher extends BrowserLauncher {
    private puppeteer: any;

    get name(): string {
        return 'chrome';
    }

    async isAvailable(): Promise<boolean> {
        try {
            this.puppeteer = await import('puppeteer');
            return true;
        } catch {
            return false;
        }
    }

    async launch(options?: BrowserLauncherOptions): Promise<BrowserInstance> {
        if (!this.puppeteer) {
            this.puppeteer = await import('puppeteer');
        }

        const browser = await this.puppeteer.launch({
            headless: options?.headless ?? true,
            args: options?.args || [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ],
            defaultViewport: {
                width: options?.width || 1280,
                height: options?.height || 720
            },
            timeout: options?.timeout || 30000,
            executablePath: options?.executablePath,
            devtools: options?.debug
        });

        return new PuppeteerBrowserInstance(browser);
    }
}

/**
 * jsdom browser launcher for fast simulated browser environment.
 * jsdom 浏览器启动器，用于快速模拟浏览器环境
 */
@Injectable()
export class JsdomLauncher extends BrowserLauncher {
    private jsdom: any;

    get name(): string {
        return 'jsdom';
    }

    async isAvailable(): Promise<boolean> {
        try {
            this.jsdom = await import('jsdom');
            return true;
        } catch {
            return false;
        }
    }

    async launch(options?: BrowserLauncherOptions): Promise<BrowserInstance> {
        if (!this.jsdom) {
            this.jsdom = await import('jsdom');
        }

        const { JSDOM } = this.jsdom;
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="test-results"></div><div id="test-summary"></div><div id="coverage-report"></div></body></html>', {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            url: 'http://localhost/'
        });

        return new JsdomBrowserInstance(dom, options);
    }
}

/**
 * Puppeteer browser instance wrapper.
 * Puppeteer 浏览器实例包装器
 */
class PuppeteerBrowserInstance implements BrowserInstance {
    constructor(private browser: any) {}

    async newContext(): Promise<BrowserContext> {
        const context = await this.browser.createIncognitoBrowserContext();
        return new PuppeteerBrowserContext(context);
    }

    async pages(): Promise<BrowserPage[]> {
        const pages = await this.browser.pages();
        return pages.map((p: any) => new PuppeteerBrowserPage(p));
    }

    async close(): Promise<void> {
        await this.browser.close();
    }

    isConnected(): boolean {
        return this.browser.isConnected();
    }
}

/**
 * Puppeteer browser context wrapper.
 * Puppeteer 浏览器上下文包装器
 */
class PuppeteerBrowserContext implements BrowserContext {
    constructor(private context: any) {}

    async newPage(): Promise<BrowserPage> {
        const page = await this.context.newPage();
        return new PuppeteerBrowserPage(page);
    }

    async close(): Promise<void> {
        await this.context.close();
    }
}

/**
 * Puppeteer browser page wrapper.
 * Puppeteer 浏览器页面包装器
 */
class PuppeteerBrowserPage implements BrowserPage {
    constructor(private page: any) {}

    async goto(url: string, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' }): Promise<void> {
        await this.page.goto(url, options);
    }

    async evaluate<T>(fn: () => T | Promise<T>): Promise<T> {
        return await this.page.evaluate(fn);
    }

    async exposeFunction(name: string, fn: (...args: any[]) => any): Promise<void> {
        await this.page.exposeFunction(name, fn);
    }

    async setViewport(viewport: { width: number; height: number }): Promise<void> {
        await this.page.setViewport(viewport);
    }

    async waitForSelector(selector: string, options?: { timeout?: number }): Promise<void> {
        await this.page.waitForSelector(selector, options);
    }

    async waitForFunction(fn: () => boolean, options?: { timeout?: number }): Promise<void> {
        await this.page.waitForFunction(fn, options);
    }

    async screenshot(options?: { path?: string; type?: 'png' | 'jpeg' }): Promise<Buffer> {
        return await this.page.screenshot(options);
    }

    on(event: 'console' | 'pageerror', handler: (msg: any) => void): void {
        this.page.on(event, handler);
    }

    async close(): Promise<void> {
        await this.page.close();
    }
}

/**
 * jsdom browser instance wrapper.
 * jsdom 浏览器实例包装器
 */
class JsdomBrowserInstance implements BrowserInstance {
    private pageList: JsdomBrowserPage[] = [];

    constructor(private dom: any, private options?: BrowserLauncherOptions) {}

    async newContext(): Promise<BrowserContext> {
        return new JsdomBrowserContext(this.dom, this.options);
    }

    async pages(): Promise<BrowserPage[]> {
        return this.pageList;
    }

    async close(): Promise<void> {
        this.dom.window.close();
    }

    isConnected(): boolean {
        return true;
    }
}

/**
 * jsdom browser context wrapper.
 * jsdom 浏览器上下文包装器
 */
class JsdomBrowserContext implements BrowserContext {
    constructor(private dom: any, private options?: BrowserLauncherOptions) {}

    async newPage(): Promise<BrowserPage> {
        const page = new JsdomBrowserPage(this.dom, this.options);
        return page;
    }

    async close(): Promise<void> {
        // Context cleanup if needed
    }
}

/**
 * jsdom browser page wrapper.
 * jsdom 浏览器页面包装器
 */
class JsdomBrowserPage implements BrowserPage {
    private consoleHandlers: Array<(msg: any) => void> = [];
    private errorHandlers: Array<(error: Error) => void> = [];

    constructor(private dom: any, private options?: BrowserLauncherOptions) {}

    async goto(url: string, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' }): Promise<void> {
        // jsdom doesn't navigate, but we can update the URL
        this.dom.window.location.href = url;
    }

    async evaluate<T>(fn: () => T | Promise<T>): Promise<T> {
        const window = this.dom.window;
        // Wrap the function and execute it within jsdom's global context
        // The function string is evaluated in the jsdom window context
        const fnString = fn.toString();
        const wrappedFn = new window.Function('return (' + fnString + ').call(this)');
        return await wrappedFn.call(window);
    }

    async exposeFunction(name: string, fn: (...args: any[]) => any): Promise<void> {
        (this.dom.window as any)[name] = fn;
    }

    async setViewport(viewport: { width: number; height: number }): Promise<void> {
        // jsdom doesn't have a real viewport, but we can simulate
        (this.dom.window as any).innerWidth = viewport.width;
        (this.dom.window as any).innerHeight = viewport.height;
    }

    async waitForSelector(selector: string, options?: { timeout?: number }): Promise<void> {
        const timeout = options?.timeout || 5000;
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const element = this.dom.window.document.querySelector(selector);
            if (element) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error(`Timeout waiting for selector: ${selector}`);
    }

    async waitForFunction(fn: () => boolean, options?: { timeout?: number }): Promise<void> {
        const timeout = options?.timeout || 5000;
        const start = Date.now();

        while (Date.now() - start < timeout) {
            try {
                if (fn.call(this.dom.window)) {
                    return;
                }
            } catch {}
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('Timeout waiting for function');
    }

    async screenshot(options?: { path?: string; type?: 'png' | 'jpeg' }): Promise<Buffer> {
        // jsdom doesn't support screenshots
        console.warn('jsdom does not support screenshots');
        return Buffer.from('');
    }

    on(event: 'console' | 'pageerror', handler: (msg: any) => void): void {
        if (event === 'console') {
            this.consoleHandlers.push(handler);
            this.dom.window.console = {
                ...this.dom.window.console,
                log: (...args: any[]) => handler({ type: 'log', args }),
                error: (...args: any[]) => handler({ type: 'error', args }),
                warn: (...args: any[]) => handler({ type: 'warning', args }),
                info: (...args: any[]) => handler({ type: 'info', args })
            };
        } else if (event === 'pageerror') {
            this.errorHandlers.push(handler);
            this.dom.window.addEventListener('error', (event: any) => {
                handler(event.error || new Error(event.message));
            });
        }
    }

    async close(): Promise<void> {
        // Page cleanup
    }
}

/**
 * Auto-detecting browser launcher - tries Chrome, falls back to jsdom.
 * 自动检测浏览器启动器 - 尝试 Chrome，回退到 jsdom
 */
@Injectable()
export class AutoBrowserLauncher extends BrowserLauncher {
    private launcher: BrowserLauncher | null = null;
    private preferredBrowser: 'chrome' | 'jsdom' | 'auto' = 'auto';

    get name(): string {
        return this.launcher?.name || 'auto';
    }

    setPreferred(browser: 'chrome' | 'jsdom' | 'auto'): void {
        this.preferredBrowser = browser;
    }

    async isAvailable(): Promise<boolean> {
        return true; // Always available (falls back to jsdom)
    }

    async launch(options?: BrowserLauncherOptions): Promise<BrowserInstance> {
        const browserType = options?.browser || this.preferredBrowser;

        if (browserType === 'jsdom') {
            this.launcher = new JsdomLauncher();
            return await this.launcher.launch(options);
        }

        if (browserType === 'chrome') {
            const chromeLauncher = new ChromeLauncher();
            if (await chromeLauncher.isAvailable()) {
                this.launcher = chromeLauncher;
                return await chromeLauncher.launch(options);
            }
            console.warn('Chrome not available, falling back to jsdom');
        }

        // Auto or fallback to jsdom
        const chromeLauncher = new ChromeLauncher();
        if (await chromeLauncher.isAvailable()) {
            this.launcher = chromeLauncher;
            return await chromeLauncher.launch(options);
        }

        this.launcher = new JsdomLauncher();
        return await this.launcher.launch(options);
    }
}