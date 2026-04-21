"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoBrowserLauncher = exports.JsdomLauncher = exports.ChromeLauncher = exports.BrowserLauncher = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Browser launcher - abstract interface for launching browsers.
 * 浏览器启动器 - 启动浏览器的抽象接口
 */
let BrowserLauncher = class BrowserLauncher {
};
exports.BrowserLauncher = BrowserLauncher;
exports.BrowserLauncher = BrowserLauncher = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], BrowserLauncher);
/**
 * Chrome Headless browser launcher using puppeteer.
 * 使用 puppeteer 的 Chrome 无头浏览器启动器
 */
let ChromeLauncher = class ChromeLauncher extends BrowserLauncher {
    get name() {
        return 'chrome';
    }
    async isAvailable() {
        try {
            this.puppeteer = await Promise.resolve().then(() => require('puppeteer'));
            return true;
        }
        catch {
            return false;
        }
    }
    async launch(options) {
        if (!this.puppeteer) {
            this.puppeteer = await Promise.resolve().then(() => require('puppeteer'));
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
};
exports.ChromeLauncher = ChromeLauncher;
exports.ChromeLauncher = ChromeLauncher = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], ChromeLauncher);
/**
 * jsdom browser launcher for fast simulated browser environment.
 * jsdom 浏览器启动器，用于快速模拟浏览器环境
 */
let JsdomLauncher = class JsdomLauncher extends BrowserLauncher {
    get name() {
        return 'jsdom';
    }
    async isAvailable() {
        try {
            this.jsdom = await Promise.resolve().then(() => require('jsdom'));
            return true;
        }
        catch {
            return false;
        }
    }
    async launch(options) {
        if (!this.jsdom) {
            this.jsdom = await Promise.resolve().then(() => require('jsdom'));
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
};
exports.JsdomLauncher = JsdomLauncher;
exports.JsdomLauncher = JsdomLauncher = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], JsdomLauncher);
/**
 * Puppeteer browser instance wrapper.
 * Puppeteer 浏览器实例包装器
 */
class PuppeteerBrowserInstance {
    constructor(browser) {
        this.browser = browser;
    }
    async newContext() {
        const context = await this.browser.createIncognitoBrowserContext();
        return new PuppeteerBrowserContext(context);
    }
    async pages() {
        const pages = await this.browser.pages();
        return pages.map((p) => new PuppeteerBrowserPage(p));
    }
    async close() {
        await this.browser.close();
    }
    isConnected() {
        return this.browser.isConnected();
    }
}
/**
 * Puppeteer browser context wrapper.
 * Puppeteer 浏览器上下文包装器
 */
class PuppeteerBrowserContext {
    constructor(context) {
        this.context = context;
    }
    async newPage() {
        const page = await this.context.newPage();
        return new PuppeteerBrowserPage(page);
    }
    async close() {
        await this.context.close();
    }
}
/**
 * Puppeteer browser page wrapper.
 * Puppeteer 浏览器页面包装器
 */
class PuppeteerBrowserPage {
    constructor(page) {
        this.page = page;
    }
    async goto(url, options) {
        await this.page.goto(url, options);
    }
    async evaluate(fn) {
        return await this.page.evaluate(fn);
    }
    async exposeFunction(name, fn) {
        await this.page.exposeFunction(name, fn);
    }
    async setViewport(viewport) {
        await this.page.setViewport(viewport);
    }
    async waitForSelector(selector, options) {
        await this.page.waitForSelector(selector, options);
    }
    async waitForFunction(fn, options) {
        await this.page.waitForFunction(fn, options);
    }
    async screenshot(options) {
        return await this.page.screenshot(options);
    }
    on(event, handler) {
        this.page.on(event, handler);
    }
    async close() {
        await this.page.close();
    }
}
/**
 * jsdom browser instance wrapper.
 * jsdom 浏览器实例包装器
 */
class JsdomBrowserInstance {
    constructor(dom, options) {
        this.dom = dom;
        this.options = options;
        this.pageList = [];
    }
    async newContext() {
        return new JsdomBrowserContext(this.dom, this.options);
    }
    async pages() {
        return this.pageList;
    }
    async close() {
        this.dom.window.close();
    }
    isConnected() {
        return true;
    }
}
/**
 * jsdom browser context wrapper.
 * jsdom 浏览器上下文包装器
 */
class JsdomBrowserContext {
    constructor(dom, options) {
        this.dom = dom;
        this.options = options;
    }
    async newPage() {
        const page = new JsdomBrowserPage(this.dom, this.options);
        return page;
    }
    async close() {
        // Context cleanup if needed
    }
}
/**
 * jsdom browser page wrapper.
 * jsdom 浏览器页面包装器
 */
class JsdomBrowserPage {
    constructor(dom, options) {
        this.dom = dom;
        this.options = options;
        this.consoleHandlers = [];
        this.errorHandlers = [];
    }
    async goto(url, options) {
        // jsdom doesn't navigate, but we can update the URL
        this.dom.window.location.href = url;
    }
    async evaluate(fn) {
        const window = this.dom.window;
        // Wrap the function and execute it within jsdom's global context
        // The function string is evaluated in the jsdom window context
        const fnString = fn.toString();
        const wrappedFn = new window.Function('return (' + fnString + ').call(this)');
        return await wrappedFn.call(window);
    }
    async exposeFunction(name, fn) {
        this.dom.window[name] = fn;
    }
    async setViewport(viewport) {
        // jsdom doesn't have a real viewport, but we can simulate
        this.dom.window.innerWidth = viewport.width;
        this.dom.window.innerHeight = viewport.height;
    }
    async waitForSelector(selector, options) {
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
    async waitForFunction(fn, options) {
        const timeout = options?.timeout || 5000;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                if (fn.call(this.dom.window)) {
                    return;
                }
            }
            catch { }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Timeout waiting for function');
    }
    async screenshot(options) {
        // jsdom doesn't support screenshots
        console.warn('jsdom does not support screenshots');
        return Buffer.from('');
    }
    on(event, handler) {
        if (event === 'console') {
            this.consoleHandlers.push(handler);
            this.dom.window.console = {
                ...this.dom.window.console,
                log: (...args) => handler({ type: 'log', args }),
                error: (...args) => handler({ type: 'error', args }),
                warn: (...args) => handler({ type: 'warning', args }),
                info: (...args) => handler({ type: 'info', args })
            };
        }
        else if (event === 'pageerror') {
            this.errorHandlers.push(handler);
            this.dom.window.addEventListener('error', (event) => {
                handler(event.error || new Error(event.message));
            });
        }
    }
    async close() {
        // Page cleanup
    }
}
/**
 * Auto-detecting browser launcher - tries Chrome, falls back to jsdom.
 * 自动检测浏览器启动器 - 尝试 Chrome，回退到 jsdom
 */
let AutoBrowserLauncher = class AutoBrowserLauncher extends BrowserLauncher {
    constructor() {
        super(...arguments);
        this.launcher = null;
        this.preferredBrowser = 'auto';
    }
    get name() {
        return this.launcher?.name || 'auto';
    }
    setPreferred(browser) {
        this.preferredBrowser = browser;
    }
    async isAvailable() {
        return true; // Always available (falls back to jsdom)
    }
    async launch(options) {
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
};
exports.AutoBrowserLauncher = AutoBrowserLauncher;
exports.AutoBrowserLauncher = AutoBrowserLauncher = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], AutoBrowserLauncher);
//# sourceMappingURL=BrowserLauncher.js.map