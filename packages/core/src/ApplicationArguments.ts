import { Abstract } from '@tsdi/ioc';


/**
 * Application run mode.
 * 应用程序运行模式
 */
export type AppMode = 'development' | 'production' | 'test' | 'staging';

/**
 * Application platform type.
 * 应用程序平台类型
 */
export type AppPlatform = 'server' | 'browser' | 'node' | 'web' | 'mobile';

/**
 * Application arguments and environment context.
 * 应用程序参数和环境上下文，集成所有环境变量和启动参数
 */
@Abstract()
export abstract class ApplicationArguments implements Record<string, any> {
    /**
     * 原始命令行参数数组
     */
    abstract get argsSource(): string[];
    
    /**
     * 解析后的命令行参数键值对
     */
    abstract get args(): Record<string, string>;
    
    /**
     * 命令列表（非参数选项的命令）
     */
    abstract get cmds(): string[];

    /**
     * 进程环境变量
     */
    abstract get env(): Record<string, any>;

    /**
     * 退出信号列表
     */
    abstract get signls(): string[];
    
    /**
     * 应用程序名称
     */
    abstract get name(): string;
    
    /**
     * 应用程序版本
     */
    abstract get version(): string;
    
    /**
     * 应用程序运行模式 (development/production/test/staging)
     */
    abstract get mode(): AppMode;
    
    /**
     * 应用程序平台 (server/browser/node/web/mobile)
     */
    abstract get platform(): AppPlatform;
    
    /**
     * 当前工作目录
     */
    abstract get cwd(): string;
    
    /**
     * 主机名
     */
    abstract get hostname(): string;
    
    /**
     * 进程ID
     */
    abstract get pid(): number;
    
    /**
     * 用户语言环境
     */
    abstract get locale(): string;
    
    /**
     * 时区
     */
    abstract get timezone(): string;
    
    /**
     * 是否启用调试模式
     */
    abstract get debug(): boolean;
    
    /**
     * 日志级别
     */
    abstract get logLevel(): string;
    
    /**
     * 应用程序基础路径
     */
    abstract get baseURL(): string;

    /**
     * 重置命令行参数
     * @param args 新的命令行参数数组
     */
    abstract reset(args: string[]): void;
    
    /**
     * 合并环境配置
     * @param env 要合并的环境配置
     */
    abstract mergeEnvironment(env: Partial<ApplicationArguments>): void;
    
    /**
     * 获取环境变量值
     * @param key 变量键名
     * @param defaultValue 默认值
     * @returns 变量值或默认值
     */
    get<T = string>(key: string, defaultValue?: T): T {
        const val = this.env[key];
        if (val !== undefined && val !== null) {
            return val as T;
        }
        return defaultValue as T;
    }
    
    /**
     * 检查环境变量是否存在
     * @param key 变量键名
     * @returns 是否存在
     */
    has(key: string): boolean {
        return this.env[key] !== undefined && this.env[key] !== null;
    }
    
    /**
     * 检查是否在生产模式
     * @returns 是否生产模式
     */
    isProduction(): boolean {
        return this.mode === 'production';
    }
    
    /**
     * 检查是否在开发模式
     * @returns 是否开发模式
     */
    isDevelopment(): boolean {
        return this.mode === 'development';
    }
    
    /**
     * 检查是否在测试模式
     * @returns 是否测试模式
     */
    isTest(): boolean {
        return this.mode === 'test';
    }
    
    /**
     * 检查是否在预发布模式
     * @returns 是否预发布模式
     */
    isStaging(): boolean {
        return this.mode === 'staging';
    }
    
    /**
     * 检查是否启用调试
     * @returns 是否调试模式
     */
    isDebug(): boolean {
        return this.debug;
    }
    
    /**
     * 检查是否在服务端平台运行
     * @returns 是否服务端平台
     */
    isServer(): boolean {
        return this.platform === 'server' || this.platform === 'node';
    }
    
    /**
     * 检查是否在浏览器平台运行
     * @returns 是否浏览器平台
     */
    isBrowser(): boolean {
        return this.platform === 'browser' || this.platform === 'web';
    }
    
    /**
     * 获取所有环境变量的副本
     * @returns 环境变量副本
     */
    getAllEnv(): Record<string, any> {
        return { ...this.env };
    }
    
    /**
     * 获取环境摘要信息
     * @returns 环境摘要对象
     */
    getSummary(): Record<string, any> {
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
}

