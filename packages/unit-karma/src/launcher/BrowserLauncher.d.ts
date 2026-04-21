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
    goto(url: string, options?: {
        timeout?: number;
        waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    }): Promise<void>;
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
    setViewport(viewport: {
        width: number;
        height: number;
    }): Promise<void>;
    /**
     * Wait for selector.
     * 等待选择器
     */
    waitForSelector(selector: string, options?: {
        timeout?: number;
    }): Promise<void>;
    /**
     * Wait for function.
     * 等待函数
     */
    waitForFunction(fn: () => boolean, options?: {
        timeout?: number;
    }): Promise<void>;
    /**
     * Screenshot.
     * 截图
     */
    screenshot(options?: {
        path?: string;
        type?: 'png' | 'jpeg';
    }): Promise<Buffer>;
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
export declare abstract class BrowserLauncher {
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
export declare class ChromeLauncher extends BrowserLauncher {
    private puppeteer;
    get name(): string;
    isAvailable(): Promise<boolean>;
    launch(options?: BrowserLauncherOptions): Promise<BrowserInstance>;
}
/**
 * jsdom browser launcher for fast simulated browser environment.
 * jsdom 浏览器启动器，用于快速模拟浏览器环境
 */
export declare class JsdomLauncher extends BrowserLauncher {
    private jsdom;
    get name(): string;
    isAvailable(): Promise<boolean>;
    launch(options?: BrowserLauncherOptions): Promise<BrowserInstance>;
}
/**
 * Auto-detecting browser launcher - tries Chrome, falls back to jsdom.
 * 自动检测浏览器启动器 - 尝试 Chrome，回退到 jsdom
 */
export declare class AutoBrowserLauncher extends BrowserLauncher {
    private launcher;
    private preferredBrowser;
    get name(): string;
    setPreferred(browser: 'chrome' | 'jsdom' | 'auto'): void;
    isAvailable(): Promise<boolean>;
    launch(options?: BrowserLauncherOptions): Promise<BrowserInstance>;
}
