import { IocCoreService, Type, Inject, Singleton, isClass, Autorun, ProviderTypes, isFunction, isString, TypeReflects, isBaseObject, ActionInjectorToken, IActionInjector } from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { BootContext, BootOption } from '../BootContext';
import { IBootApplication } from '../IBootApplication';
import { ModuleBuilderLifeScope } from './ModuleBuilderLifeScope';
import { RunnableBuildLifeScope } from './RunnableBuildLifeScope';
import { BootLifeScope } from './BootLifeScope';
import { IBuilderService, BuilderServiceToken, BootSubAppOption } from './IBuilderService';
import { CTX_APP_ENVARGS, CTX_MODULE_EXPORTS } from '../context-tokens';
import { ResolveMoudleScope } from './resolvers/ResolveMoudleScope';
import { IModuleResolveOption, BuildContext } from './resolvers/BuildContext';
import { IStartup } from '../runnable/Startup';
import { AnnoationContext } from '../AnnoationContext';
import { BuildHandles } from './BuildHandles';



/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 * @extends {IocCoreService}
 */
@Singleton(BuilderServiceToken)
@Autorun('setup')
export class BuilderService extends IocCoreService implements IBuilderService {

    @Inject(ContainerToken)
    protected container: IContainer;

    @Inject(ActionInjectorToken)
    protected actInjector: IActionInjector;

    @Inject()
    protected reflects: TypeReflects;

    setup() {
        this.actInjector
            .register(ResolveMoudleScope)
            .register(ModuleBuilderLifeScope)
            .register(RunnableBuildLifeScope)
            .register(BootLifeScope);
    }

    /**
     * resolve binding module.
     *
     * @template T
     * @param {Type<T>} target
     * @param {IModuleResolveOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async resolve<T>(target: Type<T>, options: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<T> {
        let ctx = await this.resolveContext(target, options, ...providers);
        return this.getBootTarget(ctx);
    }

    protected getBootTarget(ctx: AnnoationContext): any {
        if (ctx instanceof BootContext) {
            return ctx.getBootTarget();
        } else if (ctx instanceof BuildContext) {
            return ctx.target;
        }
        return null;
    }

    protected async resolveContext(target: Type, options: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<AnnoationContext> {
        let refs = this.reflects;
        let reflect = refs.get(target);
        if (reflect) {
            return await this.resolveModule(null, target, options, ...providers);
        } else {
            return await this.build({
                module: target,
                providers: providers,
                ...options
            });
        }
    }

    protected async resolveModule<T>(contextInit: (ctx: BuildContext) => void, target: Type<T>, options?: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<BuildContext> {
        options = options || {};
        let rctx = BuildContext.parse(options.injector || this.container, { module: target, ...options });
        providers.length && rctx.providers.inject(...providers);
        if (contextInit) {
            contextInit(rctx);
        }
        await this.actInjector.get(ResolveMoudleScope)
            .execute(rctx);
        return rctx;
    }

    /**
     * build module instace.
     *
     * @template T
     * @param {(Type | BootOption | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async buildTarget<T, Topt extends BootOption = BootOption>(target: Type<T> | Topt | BootContext, ...args: string[]): Promise<T> {
        let ctx = await this.build(target, ...args);
        return ctx.target;
    }

    build<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(target: Type | Topt | T, ...args: string[]): Promise<T> {
        return this.execLifeScope<T>(null, this.actInjector.get(ModuleBuilderLifeScope), target, ...args);
    }

    /**
     * build startup instance.
     *
     * @template T
     * @param {(Type | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<IStartup<T>>}
     * @memberof BuilderService
     */
    async buildStartup<T, Topt extends BootOption = BootOption>(target: Type | Topt | BootContext, ...args: string[]): Promise<IStartup<T>> {
        let ctx = await this.execLifeScope(ctx => {
            ctx.getOptions().autorun = false
        }, this.actInjector.get(RunnableBuildLifeScope), target, ...args);
        return ctx.runnable;
    }

    /**
     * build startup instance.
     *
     * @template T
     * @param {(Type | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<IStartup<T>>}
     * @memberof BuilderService
     */
    buildRunnable<T, Topt extends BootOption = BootOption>(target: Type | Topt | BootContext, ...args: string[]): Promise<IStartup<T>> {
        return this.buildStartup(target, ...args);
    }

    /**
     * run module.
     *
     * @template T
     * @template Topt
     * @param {(Type | Topt | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    run<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(target: Type | Topt | T, ...args: string[]): Promise<T> {
        return this.execLifeScope<T, Topt>(null, this.actInjector.get(RunnableBuildLifeScope), target, ...args);
    }


    /**
     * boot application.
     *
     * @template T
     * @param {(Type | BootOption | T)} target
     * @param {(BootSubAppOption<T> | string)} [options]
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async boot<T extends BootContext, Topt extends BootOption = BootOption>(target: Type | Topt | T, options?: (ctx: T) => void | BootSubAppOption<T> | string, ...args: string[]): Promise<T> {
        let opt: BootSubAppOption<T>;
        if (isFunction(options)) {
            opt = { contextInit: options };
        } else if (isString(options)) {
            args.unshift(options);
            opt = {};
        } else {
            opt = options || {};
        }
        let ctx = await this.execLifeScope(
            ctx => {
                if (opt.contextInit) {
                    opt.contextInit(ctx as T);
                }
            },
            this.actInjector.get(BootLifeScope),
            target,
            ...args);

        if (isFunction(opt.regExports) && ctx.has(CTX_MODULE_EXPORTS)) {
            opt.regExports(ctx as T, this.container);
        }
        return ctx as T;

    }

    /**
     * boot application.
     *
     * @template T
     * @param {(Type | BootOption | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async bootApp(application: IBootApplication, ...args: string[]): Promise<BootContext> {
        return await this.execLifeScope(
            (ctx) => {
                if (isFunction(application.onContextInit)) {
                    application.onContextInit(ctx);
                }
            },
            this.actInjector.get(BootLifeScope),
            application.target,
            ...args);
    }

    protected async execLifeScope<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(contextInit: (ctx: T) => void, scope: BuildHandles<T>, target: Type | Topt | T, ...args: string[]): Promise<T> {
        let ctx: T;
        if (target instanceof BootContext) {
            ctx = target as T;
        } else {
            let md = isClass(target) ? target : target.module;
            ctx = this.container.getService({ token: BootContext, target: md }) as T;
            ctx.setModule(md);
        }
        if (isBaseObject(target)) {
            ctx.setOptions(target as BootOption);
        }
        ctx.set(CTX_APP_ENVARGS, args);
        if (contextInit) {
            contextInit(ctx);
        }
        await scope.execute(ctx);
        return ctx;
    }
}
