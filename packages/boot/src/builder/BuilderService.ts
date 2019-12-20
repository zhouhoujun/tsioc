import {
    IocCoreService, Inject, Singleton, Autorun, TypeReflects,
    isFunction, isString, isBaseObject, isClassType, ClassType
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { BootContext, BootOption } from '../BootContext';
import { IBootApplication } from '../IBootApplication';
import { ModuleBuilderLifeScope } from './ModuleBuilderLifeScope';
import { RunnableBuildLifeScope } from './RunnableBuildLifeScope';
import { BootLifeScope } from './BootLifeScope';
import { IBuilderService, BuilderServiceToken, BootSubAppOption } from './IBuilderService';
import { CTX_APP_ENVARGS, CTX_MODULE_EXPORTS } from '../context-tokens';
import { ResolveMoudleScope } from './resolvers/ResolveMoudleScope';
import { IModuleBuildOption, BuildContext } from './resolvers/BuildContext';
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

    @Inject()
    protected reflects: TypeReflects;

    setup() {
        this.reflects.getActionInjector()
            .register(ResolveMoudleScope)
            .register(ModuleBuilderLifeScope)
            .register(RunnableBuildLifeScope)
            .register(BootLifeScope);
    }

    /**
     * resolve binding module.
     *
     * @template T
     * @param {ClassType<T> | IModuleBuildOption} target
     * @param {IModuleBuildOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async resolve<T>(target: ClassType<T> | IModuleBuildOption<T>): Promise<T> {
        let ctx = await this.resolveContext(target);
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

    protected async resolveContext(target: ClassType | IModuleBuildOption): Promise<AnnoationContext> {
        let refs = this.reflects;
        let options = isClassType(target) ? { module: target } : target;
        let reflect = refs.get(options.module);
        if (reflect) {
            return await this.resolveModule(options);
        } else {
            return await this.build(options);
        }
    }

    protected async resolveModule<T>(options: IModuleBuildOption): Promise<BuildContext> {
        let rctx = BuildContext.parse(options.injector || this.container, options);
        await this.reflects.getActionInjector().get(ResolveMoudleScope)
            .execute(rctx);
        return rctx;
    }

    build(target: ClassType | BootOption | BootContext, ...args: string[]): Promise<BootContext>
    build<Topt extends BootOption>(target: ClassType | Topt | BootContext, ...args: string[]): Promise<BootContext>;
    build<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(target: ClassType | Topt | T, ...args: string[]): Promise<T> {
        return this.execLifeScope<T>(null, this.reflects.getActionInjector().get(ModuleBuilderLifeScope), target, ...args);
    }

    /**
     * build startup instance.
     *
     * @template T
     * @param {(ClassType | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<IStartup<T>>}
     * @memberof BuilderService
     */
    async buildStartup<T, Topt extends BootOption = BootOption>(target: ClassType | Topt | BootContext, ...args: string[]): Promise<IStartup<T>> {
        let ctx = await this.execLifeScope(ctx => {
            ctx.getOptions().autorun = false
        }, this.reflects.getActionInjector().get(RunnableBuildLifeScope), target, ...args);
        return ctx.runnable;
    }

    /**
     * build startup instance.
     *
     * @template T
     * @param {(ClassType | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<IStartup<T>>}
     * @memberof BuilderService
     */
    buildRunnable<T, Topt extends BootOption = BootOption>(target: ClassType | Topt | BootContext, ...args: string[]): Promise<IStartup<T>> {
        return this.buildStartup(target, ...args);
    }

    /**
     * run module.
     *
     * @template T
     * @template Topt
     * @param {(ClassType | Topt | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    run<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(target: ClassType | Topt | T, ...args: string[]): Promise<T> {
        return this.execLifeScope<T, Topt>(null, this.reflects.getActionInjector().get(RunnableBuildLifeScope), target, ...args);
    }


    /**
     * boot application.
     *
     * @template T
     * @param {(ClassType | BootOption | T)} target
     * @param {(BootSubAppOption<T> | string)} [options]
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async boot<T extends BootContext, Topt extends BootOption = BootOption>(target: ClassType | Topt | T, options?: (ctx: T) => void | BootSubAppOption<T> | string, ...args: string[]): Promise<T> {
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
            this.reflects.getActionInjector().get(BootLifeScope),
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
            this.reflects.getActionInjector().get(BootLifeScope),
            application.target,
            ...args);
    }

    protected async execLifeScope<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(contextInit: (ctx: T) => void, scope: BuildHandles<T>, target: ClassType | Topt | T, ...args: string[]): Promise<T> {
        let ctx: T;
        if (target instanceof BootContext) {
            ctx = target as T;
        } else {
            let md = isClassType(target) ? target : target.module;
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
