import { AbstractType, Type, Provider, Injector, Modules, ModuleDef, ModuleMetadata, ClassRef, ModuleRef, ModuleType } from '@tsdi/ioc';
import { ApplicationContext, ApplicationOption, EnvironmentOption } from './ApplicationContext';
import { ModuleLoader } from './ModuleLoader';
/**
 * application.
 *
 * 应用程序启动入口
 *
 * @export
 * @class Application
 */
export declare class Application<T = any> {
    protected target: Type<T> | ApplicationOption<T>;
    /**
     * root module ref.
     *
     * 应用程序启动根模块
     */
    readonly root: ModuleRef<T>;
    /**
     * application context.
     *
     * 应用程序上下文
     */
    protected context: ApplicationContext<T>;
    /**
     * module loader
     */
    protected loader: ModuleLoader;
    constructor(target: Type<T> | ApplicationOption<T>, loader?: ModuleLoader);
    protected getPlatformDefaultProviders(): Provider[];
    protected getRootDependencies(): ModuleType[];
    protected getRootDependenceProviders(): Provider[];
    protected getRootDefaultProviders(): Provider[];
    /**
     * get application context.
     *
     * 获取当前启动应用程序的上下文.
     *
     * @returns instance of {@link ApplicationContext}.
     */
    getContext(): ApplicationContext<T>;
    /**
     * bootstrap application.
     *
     * 根据配置启动运行应用程序
     *
     * @static
     * @param {ApplicationOption} option option of type {@link ApplicationOption}
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run<T>(option: ApplicationOption<T>): Promise<ApplicationContext<T>>;
    /**
     * bootstrap application.
     *
     * 根据模块，环境变量启动运行应用程序
     *
     * @static
     * @param {AbstractType<T>} target target class type.
     * @param {EnvironmentOption} [option] option {@link EnvironmentOption} application run depdences.
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run<T>(target: AbstractType<T>, option?: EnvironmentOption): Promise<ApplicationContext<T>>;
    /**
     * run application of module.
     *
     * 启动应用程序
     *
     * @param {...string[]} args
     * @returns {Promise<ApplicationContext<T, TArg>>}
     */
    run(): Promise<ApplicationContext<T>>;
    /**
     * close application.
     *
     * 关闭应用程序
     *
     * @returns
     */
    close(): Promise<void>;
    protected getDeps(): Modules[];
    protected createInjector<T>(providers: Provider[], option: ApplicationOption<T>): ModuleRef<any>;
    protected createModuleRef<T>(container: Injector, option: ApplicationOption<T>): ModuleRef<any>;
    protected moduleify(module: AbstractType | ClassRef | ModuleMetadata | ModuleDef): Type | ClassRef;
    protected initRoot(): void;
    protected createContext(): Promise<ApplicationContext<T>>;
    protected prepareContext(ctx: ApplicationContext<T>): any;
    protected refreshContext(ctx: ApplicationContext<T>): any;
    protected callRunners(ctx: ApplicationContext<T>): Promise<void>;
    protected handleRunFailure(ctx: ApplicationContext<T>, error: Error | any): Promise<void>;
}
/**
 * bootstrap application.
 *
 * 根据配置启动运行应用程序
 *
 * @param {ApplicationOption} option option of type {@link ApplicationOption}
 * @returns async returnning instance of {@link ApplicationContext}.
 */
export declare function bootstrapApplication<T>(option: ApplicationOption<T>): Promise<ApplicationContext<T>>;
/**
 * bootstrap application.
 *
 * 根据模块，环境变量启动运行应用程序
 *
 * @param {AbstractType<T>} target target class type.
 * @param {EnvironmentOption} [option] option {@link EnvironmentOption} application run depdences.
 * @returns async returnning instance of {@link ApplicationContext}.
 */
export declare function bootstrapApplication<T>(target: AbstractType<T>, option?: EnvironmentOption): Promise<ApplicationContext<T>>;
