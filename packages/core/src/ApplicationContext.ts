import {
    Provider, Injector, Abstract, AbstractType, Type, Destroyable, Modules, ModuleOption, ModuleRef,
    ModuleMetadata, ModuleDef, ClassRef, Invocation, InvokeOptions, DestroyCallback,
    ModuleType
} from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { ApplicationRunners } from './ApplicationRunners';
import { ApplicationArguments, AppMode, AppPlatform } from './ApplicationArguments';
import { LoadType, ModuleLoader } from './ModuleLoader';
import { InvocationHandlerOptions } from './invocation';
import { ApplicationEventPublisher } from './ApplicationEventPublisher';
import { ApplicationEventMulticaster } from './ApplicationEventMulticaster';
import { ApplicationEvent } from './ApplicationEvent';

/**
 * application context for global.
 * extends {@link Injector} and implements {@link Destroyable}.
 *
 * 应用上下文环境，继承自IOC容器Injector，实现Destroyable接口
 * 提供应用程序运行时的上下文环境，包括模块实例、运行器、事件发布器等
 */
@Abstract()
export abstract class ApplicationContext<T = object>
    extends Injector implements ApplicationEventPublisher {
    /**
     * 模块实例
     */
    abstract get instance(): T;
    /**
     * 应用程序基础路径
     */
    abstract get baseURL(): string;
    /**
     * 获取应用程序参数/环境上下文
     */
    abstract getArguments(): ApplicationArguments;
    /**
     * 应用程序运行器
     */
    abstract get runners(): ApplicationRunners;
    /**
     * 应用程序事件多播器
     */
    abstract get eventMulticaster(): ApplicationEventMulticaster;
    /**
     * 启动引导类型
     * @param type 引导类型
     * @param option 引导选项
     */
    abstract bootstrap<C, TArg>(type: AbstractType<C> | ClassRef<C>, option?: BootstrapOption): Promise<Invocation<C>>;
    /**
     * 获取日志器
     * @param name 日志器名称
     * @param adapter 日志适配器
     */
    abstract getLogger(name?: string, adapter?: string | AbstractType): Logger;
    /**
     * 发布应用程序事件
     * @param event 事件对象
     */
    abstract publishEvent(event: ApplicationEvent | Object): Promise<void>;
    /**
     * 刷新上下文
     */
    abstract refresh(): Promise<void>;
    /**
     * 关闭应用程序
     */
    abstract close(): Promise<void>;
    /**
     * 销毁应用程序
     */
    abstract destroy(): Promise<void>;

}

/**
 * bootstrap option for {@link RunnableRef}.
 * 引导选项，用于配置应用程序启动引导过程
 */
export interface BootstrapOption extends InvocationHandlerOptions<any> {
}

/**
 * Environment option.
 * 应用程序环境配置选项，整合了模块选项、调用选项和环境参数
 * 包含应用程序运行所需的所有配置信息
 */
export interface EnvironmentOption extends ModuleOption, InvokeOptions {
    /**
     * 应用程序基础路径
     */
    baseURL?: string;
    /**
     * 注入器实例
     */
    injector?: Injector;
    /**
     * 模块加载器
     */
    loader?: ModuleLoader;
    /**
     * 应用程序依赖模块
     */
    loads?: LoadType[];    
    /**
     * load dependence. register after root module injector init.
     */
    loadDeps?: ModuleType<Type>[];
    /**
     * 应用程序参数/环境上下文
     */
    args?: ApplicationArguments | null;
    /**
     * 平台依赖模块
     */
    platformDeps?: Modules[];
    /**
     * 平台服务提供者
     */
    platformProviders?: Provider[];
    /**
     * 运行器选项
     */
    runnersOptions?: InvocationHandlerOptions;
    /**
     * 事件选项
     */
    eventsOptions?: InvocationHandlerOptions;
    /**
     * 应用程序名称
     */
    name?: string;
    /**
     * 应用程序版本
     */
    version?: string;
    /**
     * 应用程序运行模式 (development/production/test/staging)
     */
    mode?: AppMode;
    /**
     * 应用程序平台 (server/browser/node/web/mobile)
     */
    platform?: AppPlatform;
    /**
     * 当前工作目录
     */
    cwd?: string;
    /**
     * 主机名
     */
    hostname?: string;
    /**
     * 进程ID
     */
    pid?: number;
    /**
     * 用户语言环境
     */
    locale?: string;
    /**
     * 时区
     */
    timezone?: string;
    /**
     * 是否启用调试模式
     */
    debug?: boolean;
    /**
     * 日志级别
     */
    logLevel?: string;
}

/**
 * ApplicationOption option.
 * 应用程序选项，继承自环境配置，包含目标模块定义
 */
export interface ApplicationOption<T = object> extends EnvironmentOption {
    /**
     * 目标模块类型
     */
    module: Type<T> | ModuleDef<T> | ModuleMetadata;
}

/**
 * application context factory, to create instance of {@link ApplicationContext}.
 * 应用程序上下文工厂，用于创建ApplicationContext实例
 */
@Abstract()
export abstract class ApplicationContextFactory {
    /**
     * 创建应用程序上下文实例
     * @param root 主模块引用
     * @param option 应用程序选项
     * @returns 应用程序上下文实例
     */
    abstract create<T>(root: ModuleRef<T>, option?: EnvironmentOption): ApplicationContext<T>;
}
