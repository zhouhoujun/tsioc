import { IocCoreService, Type, Inject, Singleton, isClass, Autorun, ProviderTypes, isFunction, isString, TypeReflects, CTX_ARGS } from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { BootContext, BootOption, BootTargetToken } from '../BootContext';
import { BuildHandles, HandleRegisterer, RegFor, ContainerPoolToken } from '../core';
import { IBootApplication } from '../IBootApplication';
import { ModuleBuilderLifeScope } from './ModuleBuilderLifeScope';
import { ResolveMoudleScope, IModuleResolveOption, BuildContext } from './resovers';
import { RunnableBuildLifeScope } from './RunnableBuildLifeScope';
import { BootLifeScope } from './BootLifeScope';
import { IStartup } from '../runnable';
import { IBuilderService, BuilderServiceToken, BootSubAppOption } from './IBuilderService';
import { CTX_MODULE_RESOLVER, CTX_MODULE_REGFOR, CTX_APP_ENVARGS } from '../context-tokens';



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

    @Inject()
    protected reflects: TypeReflects;

    setup() {
        this.container.getInstance(HandleRegisterer)
            .register(this.container, ResolveMoudleScope, true)
            .register(this.container, ModuleBuilderLifeScope, true)
            .register(this.container, RunnableBuildLifeScope, true)
            .register(this.container, BootLifeScope, true);
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
        let refs = this.reflects;
        let reflect = refs.get(target);
        if (reflect) {
            let rctx = await this.resolveModule(null, target, options, ...providers);
            return rctx.target;
        } else {
            return this.buildBootTarget({
                module: target,
                providers: providers,
                regFor: RegFor.boot,
                ...options
            })
        }
    }

    protected async resolveModule<T>(contextInit: (ctx: BuildContext) => void, target: Type<T>, options: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<BuildContext> {
        let rctx = BuildContext.parse({ module: target, ...(options || {}) });
        if (providers.length) {
            rctx.getOptions().providers = rctx.providers.concat(providers);
        }
        if (contextInit) {
            contextInit(rctx);
        }
        if (!rctx.has()) {
            rctx.setRaiseContainer(this.container)
        }
        await this.container.getInstance(HandleRegisterer)
            .get(ResolveMoudleScope)
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

    async buildBootTarget(target: Type | BootOption | BootContext, ...args: string[]): Promise<any> {
        let ctx = await this.build(target, ...args);
        return ctx.getBootTarget();
    }

    build<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(target: Type | Topt | T, ...args: string[]): Promise<T> {
        return this.execLifeScope<T>(null, this.container.getInstance(HandleRegisterer).get(ModuleBuilderLifeScope), target, ...args);
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
        }, this.container.getInstance(HandleRegisterer).get(RunnableBuildLifeScope), target, ...args);
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
        return this.execLifeScope<T, Topt>(null, this.container.getInstance(HandleRegisterer).get(RunnableBuildLifeScope), target, ...args);
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
                ctx.setRaiseContainer(this.container.get(ContainerPoolToken).create());
                if (opt.contextInit) {
                    opt.contextInit(ctx as T);
                }
            },
            this.container.getInstance(HandleRegisterer).get(BootLifeScope),
            target,
            ...args);

        if (isFunction(opt.regExports) && ctx.has(CTX_MODULE_RESOLVER)) {
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
                ctx.set(CTX_MODULE_REGFOR, RegFor.boot);
                if (isFunction(application.onContextInit)) {
                    application.onContextInit(ctx);
                }
            },
            this.container.getInstance(HandleRegisterer).get(BootLifeScope),
            application.target,
            ...args);
    }

    protected async execLifeScope<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(contextInit: (ctx: T) => void, scope: BuildHandles<T>, target: Type | Topt | T, ...args: string[]): Promise<T> {
        let ctx: T;
        if (target instanceof BootContext) {
            ctx = target as T;
        } else {
            let md = isClass(target) ? target : target.module;
            ctx = this.container.getService({ token: BootContext, target: md }, { provide: BootTargetToken, useValue: md }) as T;
            if (!isClass(target)) {
                ctx.setOptions(target);
            }
        }
        if (!ctx.has()) {
            ctx.setRaiseContainer(this.container);
        }
        ctx.set(CTX_APP_ENVARGS, args);
        if (contextInit) {
            contextInit(ctx);
        }
        await scope.execute(ctx);
        return ctx;
    }
}
