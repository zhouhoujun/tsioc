import { IocCoreService, Type, Inject, Singleton, isClass, Autorun, ProviderTypes, isFunction, isString, ContainerFactoryToken } from '@tsdi/ioc';
import { BootContext, BootOption, BootTargetToken } from '../BootContext';
import { IContainer, ContainerToken } from '@tsdi/core';
import { BuildHandles, BuildHandleRegisterer, RegFor, ContainerPoolToken } from '../core';
import { IBootApplication } from '../IBootApplication';
import { ModuleBuilderLifeScope } from './ModuleBuilderLifeScope';
import { ResolveMoudleScope, IModuleResolveOption, BuildContext } from './resovers';
import { RunnableBuildLifeScope } from './RunnableBuildLifeScope';
import { BootLifeScope } from './BootLifeScope';
import { IRunnable } from '../runnable';
import { IBuilderService, BuilderServiceToken, BootSubAppOption } from './IBuilderService';



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

    setup() {
        this.container.get(BuildHandleRegisterer)
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
        let rctx = await this.resolveModule(target, options, ...providers);
        return rctx.target;
    }

    protected async resolveModule<T>(target: Type<T>, options: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<BuildContext> {
        if (!options.raiseContainer) {
            options.raiseContainer = this.container.get(ContainerFactoryToken);
        }
        let rctx = BuildContext.parse(target, options);
        if (providers.length) {
            rctx.providers = (rctx.providers || []).concat(providers);
        }
        await this.container.get(BuildHandleRegisterer)
            .get(ResolveMoudleScope)
            .execute(rctx);
        return rctx;
    }

    /**
     * build module instace.
     *
     * @template T
     * @param {(Type<any> | BootOption | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async buildTarget<T>(target: Type<T> | BootOption | BootContext, ...args: string[]): Promise<T> {
        let ctx = await this.build(target, ...args);
        return ctx.target;
    }

    async buildBootTarget(target: Type<any> | BootOption | BootContext, ...args: string[]): Promise<any> {
        let ctx = await this.build(target, ...args);
        return ctx.getBootTarget();
    }

    /**
     * build module.
     *
     * @template T
     * @param {(Type<any> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    build<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
        return this.execLifeScope(null, this.container.get(BuildHandleRegisterer).get(ModuleBuilderLifeScope), target, ...args);
    }

    /**
     * create runnable.
     *
     * @template T
     * @param {(Type<any> | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<IRunnable<T>>}
     * @memberof BuilderService
     */
    async buildRunnable<T>(target: Type<any> | BootOption | BootContext, ...args: string[]): Promise<IRunnable<T>> {
        let ctx = await this.execLifeScope(ctx => ctx.autorun = false, this.container.get(BuildHandleRegisterer).get(RunnableBuildLifeScope), target, ...args);
        return ctx.runnable;
    }

    /**
     * run module.
     *
     * @template T
     * @param {(Type<any> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof RunnerService
     */
    run<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
        return this.execLifeScope(null, this.container.get(BuildHandleRegisterer).get(RunnableBuildLifeScope), target, ...args);
    }


    /**
     * boot application.
     *
     * @template T
     * @param {(Type<any> | BootOption | T)} target
     * @param {(BootSubAppOption<T> | string)} [options]
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async boot<T extends BootContext>(target: Type<any> | BootOption | T, options?: (ctx: T) => void | BootSubAppOption<T> | string, ...args: string[]): Promise<T> {
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
            this.container.get(BuildHandleRegisterer).get(BootLifeScope),
            target,
            ...args);

        if (isFunction(opt.regExports) && ctx.moduleResolver) {
            opt.regExports(ctx, this.container);
        }
        return ctx;

    }

    /**
     * boot application.
     *
     * @template T
     * @param {(Type<any> | BootOption | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async bootApp(application: IBootApplication, ...args: string[]): Promise<BootContext> {
        await this.container.load(...application.getBootDeps());
        return await this.execLifeScope(
            (ctx) => {
                ctx.regFor = RegFor.boot;
                if (isFunction(application.onContextInit)) {
                    application.onContextInit(ctx);
                }
            },
            this.container.get(BuildHandleRegisterer).get(BootLifeScope),
            application.target,
            ...args);
    }

    protected async execLifeScope<T extends BootContext>(contextInit: (ctx: BootContext) => void, scope: BuildHandles<BootContext>, target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
        let ctx: BootContext;
        if (target instanceof BootContext) {
            ctx = target;
            if (!ctx.hasRaiseContainer()) {
                ctx.setRaiseContainer(this.container);
            }
        } else {
            let md = isClass(target) ? target : target.module;
            ctx = this.container.getService({ token: BootContext, target: md }, { provide: BootTargetToken, useValue: md });
            if (!isClass(target)) {
                ctx.setOptions(target);
            }
        }

        ctx.args = args;
        if (contextInit) {
            contextInit(ctx);
        }
        await scope.execute(ctx);
        return ctx as T;
    }
}
