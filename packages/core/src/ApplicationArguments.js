"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationArguments = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Application arguments and environment context.
 * 应用程序参数和环境上下文，集成所有环境变量和启动参数
 */
let ApplicationArguments = class ApplicationArguments {
    /**
     * 获取环境变量值
     * @param key 变量键名
     * @param defaultValue 默认值
     * @returns 变量值或默认值
     */
    get(key, defaultValue) {
        const val = this.env[key];
        if (val !== undefined && val !== null) {
            return val;
        }
        return defaultValue;
    }
    /**
     * 检查环境变量是否存在
     * @param key 变量键名
     * @returns 是否存在
     */
    has(key) {
        return this.env[key] !== undefined && this.env[key] !== null;
    }
    /**
     * 检查是否在生产模式
     * @returns 是否生产模式
     */
    isProduction() {
        return this.mode === 'production';
    }
    /**
     * 检查是否在开发模式
     * @returns 是否开发模式
     */
    isDevelopment() {
        return this.mode === 'development';
    }
    /**
     * 检查是否在测试模式
     * @returns 是否测试模式
     */
    isTest() {
        return this.mode === 'test';
    }
    /**
     * 检查是否在预发布模式
     * @returns 是否预发布模式
     */
    isStaging() {
        return this.mode === 'staging';
    }
    /**
     * 检查是否启用调试
     * @returns 是否调试模式
     */
    isDebug() {
        return this.debug;
    }
    /**
     * 检查是否在服务端平台运行
     * @returns 是否服务端平台
     */
    isServer() {
        return this.platform === 'server' || this.platform === 'node';
    }
    /**
     * 检查是否在浏览器平台运行
     * @returns 是否浏览器平台
     */
    isBrowser() {
        return this.platform === 'browser' || this.platform === 'web';
    }
    /**
     * 获取所有环境变量的副本
     * @returns 环境变量副本
     */
    getAllEnv() {
        return { ...this.env };
    }
    /**
     * 获取环境摘要信息
     * @returns 环境摘要对象
     */
    getSummary() {
        return {
            name: this.name,
            version: this.version,
            mode: this.mode,
            platform: this.platform,
            cwd: this.cwd,
            hostname: this.hostname,
            pid: this.pid,
            debug: this.debug,
            baseURL: this.baseURL
        };
    }
};
exports.ApplicationArguments = ApplicationArguments;
exports.ApplicationArguments = ApplicationArguments = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ApplicationArguments);
//# sourceMappingURL=ApplicationArguments.js.map