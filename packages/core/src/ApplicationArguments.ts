import { Abstract } from '@tsdi/ioc';


/**
 * Application run mode.
 * 
 * 应用程序运行模式
 */
export type AppMode = 'development' | 'production' | 'test' | 'staging';

/**
 * Application platform type.
 * 
 * 应用程序平台类型
 */
export type AppPlatform = 'server' | 'browser' | 'node' | 'web' | 'mobile';

/**
 * Application environment configuration interface.
 * 
 * 应用程序环境配置接口
 */
export interface EnvironmentConfig {
    /**
     * Application name.
     * 
     * 应用程序名称
     */
    name?: string;
    /**
     * Application version.
     * 
     * 应用程序版本
     */
    version?: string;
    /**
     * Application run mode.
     * 
     * 应用程序运行模式
     */
    mode?: AppMode;
    /**
     * Application platform.
     * 
     * 应用程序平台
     */
    platform?: AppPlatform;
    /**
     * Base URL for application.
     * 
     * 应用程序基础路径
     */
    baseURL?: string;
    /**
     * Current working directory.
     * 
     * 当前工作目录
     */
    cwd?: string;
    /**
     * Hostname.
     * 
     * 主机名
     */
    hostname?: string;
    /**
     * Process ID (for server platform).
     * 
     * 进程ID（服务端平台）
     */
    pid?: number;
    /**
     * User locale/language.
     * 
     * 用户语言环境
     */
    locale?: string;
    /**
     * Timezone.
     * 
     * 时区
     */
    timezone?: string;
    /**
     * Debug mode enabled.
     * 
     * 是否启用调试模式
     */
    debug?: boolean;
    /**
     * Log level.
     * 
     * 日志级别
     */
    logLevel?: string;
}

/**
 * Application environment. Comprehensive app context environment object.
 * Extends original ApplicationArguments with additional environment properties and helper methods.
 * 
 * 应用程序环境上下文。集成所有环境变量的综合应用程序上下文环境对象。
 * 在原有ApplicationArguments基础上扩展更多环境属性和辅助方法。
 */
@Abstract()
export abstract class ApplicationArguments implements Record<string, any>, EnvironmentConfig {
    // ==================== Original Properties ====================
    
    /** 
     * process args source
     * 
     * 应用程序启动参数源  
     */
    abstract get argsSource(): string[];
    /** 
     * process args map. 
     * 
     * 应用程序启动参数集
     */
    abstract get args(): Record<string, string>;
    /**
     * process args command.
     *  
     * 应用程序启动命令
     */
    abstract get cmds(): string[];

    /**
     * process env 
     * 
     * 应用程序启动环境变量
     */
    abstract get env(): Record<string, any>;

    /**
     * process exit signls. 
     * 
     * 应用程序退出信号
     */
    abstract get signls(): string[];

    // ==================== New Environment Properties ====================
    
    /**
     * Application name.
     * 
     * 应用程序名称
     */
    abstract get name(): string;
    
    /**
     * Application version.
     * 
     * 应用程序版本
     */
    abstract get version(): string;
    
    /**
     * Application run mode.
     * 
     * 应用程序运行模式
     */
    abstract get mode(): AppMode;
    
    /**
     * Application platform type.
     * 
     * 应用程序平台类型
     */
    abstract get platform(): AppPlatform;
    
    /**
     * Current working directory.
     * 
     * 当前工作目录
     */
    abstract get cwd(): string;
    
    /**
     * Hostname.
     * 
     * 主机名
     */
    abstract get hostname(): string;
    
    /**
     * Process ID (for server/node platform).
     * 
     * 进程ID（服务端/Node平台）
     */
    abstract get pid(): number;
    
    /**
     * User locale/language.
     * 
     * 用户语言环境
     */
    abstract get locale(): string;
    
    /**
     * Timezone.
     * 
     * 时区
     */
    abstract get timezone(): string;
    
    /**
     * Debug mode enabled.
     * 
     * 是否启用调试模式
     */
    abstract get debug(): boolean;
    
    /**
     * Log level.
     * 
     * 日志级别
     */
    abstract get logLevel(): string;
    
    /**
     * Base URL for application.
     * 
     * 应用程序基础路径
     */
    abstract get baseURL(): string;

    // ==================== Helper Methods ====================
    
    /** 
     * reset args. 
     * 
     * 重置应用程序启动参数
     * @param args the args reset with. 
     */
    abstract reset(args: string[]): void;
    
    /**
     * Get environment variable value by key with optional default value.
     * 
     * 根据键名获取环境变量值，支持默认值
     * @param key environment variable key
     * @param defaultValue default value if key not found
     */
    get<T = string>(key: string, defaultValue?: T): T {
        const val = this.env[key];
        if (val !== undefined && val !== null) {
            return val as T;
        }
        return defaultValue as T;
    }
    
    /**
     * Check if environment variable exists.
     * 
     * 检查环境变量是否存在
     * @param key environment variable key
     */
    has(key: string): boolean {
        return this.env[key] !== undefined && this.env[key] !== null;
    }
    
    /**
     * Check if application is running in production mode.
     * 
     * 检查应用程序是否在生产模式下运行
     */
    isProduction(): boolean {
        return this.mode === 'production';
    }
    
    /**
     * Check if application is running in development mode.
     * 
     * 检查应用程序是否在开发模式下运行
     */
    isDevelopment(): boolean {
        return this.mode === 'development';
    }
    
    /**
     * Check if application is running in test mode.
     * 
     * 检查应用程序是否在测试模式下运行
     */
    isTest(): boolean {
        return this.mode === 'test';
    }
    
    /**
     * Check if application is running in staging mode.
     * 
     * 检查应用程序是否在预发布模式下运行
     */
    isStaging(): boolean {
        return this.mode === 'staging';
    }
    
    /**
     * Check if debug mode is enabled.
     * 
     * 检查是否启用调试模式
     */
    isDebug(): boolean {
        return this.debug;
    }
    
    /**
     * Check if running on server platform.
     * 
     * 检查是否在服务端平台运行
     */
    isServer(): boolean {
        return this.platform === 'server' || this.platform === 'node';
    }
    
    /**
     * Check if running on browser platform.
     * 
     * 检查是否在浏览器平台运行
     */
    isBrowser(): boolean {
        return this.platform === 'browser' || this.platform === 'web';
    }
    
    /**
     * Get all environment variables as a copy.
     * 
     * 获取所有环境变量的副本
     */
    getAllEnv(): Record<string, any> {
        return { ...this.env };
    }
    
    /**
     * Merge additional environment configuration.
     * 
     * 合并额外的环境配置
     * @param config additional environment configuration
     */
    abstract mergeConfig(config: EnvironmentConfig): void;
    
    /**
     * Get environment summary for logging/debugging.
     * 
     * 获取环境摘要信息，用于日志和调试
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

