import {
    IocCoreService, Inject, Singleton, isFunction, isString, isClassType,
    ClassType, TypeReflectsToken, ITypeReflects, IInjector, INJECTOR
} from '@tsdi/ioc';
import { IContainer, ContainerToken, ICoreInjector } from '@tsdi/core';
import { BootContext, BootOption } from '../BootContext';
import { IBootApplication } from '../IBootApplication';
import { RunnableBuildLifeScope } from '../boots/RunnableBuildLifeScope';
import { BootLifeScope } from '../boots/BootLifeScope';
import { IBuilderService, BuilderServiceToken, BootSubAppOption } from './IBuilderService';
import { CTX_APP_ENVARGS, CTX_MODULE_EXPORTS } from '../context-tokens';
import { ResolveMoudleScope } from '../builder/resolvers/ResolveMoudleScope';
import { BuildContext } from '../builder/BuildContext';
import { BuildHandles } from '../builder/BuildHandles';
import { IBuildOption } from '../builder/IBuildOption';



/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 * @extends {IocCoreService}
 */
@Singleton(BuilderServiceToken)
export class BuilderService extends IocCoreService implements IBuilderService {

    @Inject(ContainerToken)
    protected container: IContainer;

    @Inject(TypeReflectsToken)
    protected reflects: ITypeReflects;

    /**
     * resolve binding module.
     *
     * @template T
     * @param {ClassType<T> | IBuildOption} target
     * @param {IBuildOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async resolve<T>(target: ClassType<T> | IBuildOption<T>): Promise<T> {
        let ctx = await this.build(target);
        return ctx.target;
    }

    async build<T>(target: ClassType<T> | IBuildOption<T>): Promise<BuildContext> {
        let injector: ICoreInjector;
        let options: IBuildOption
        if (isClassType(target)) {
            injector = this.reflects.getInjector(target);
            options = { type: target };
        } else {
            injector = target.injector;
            if (!injector) {
                let md = target.type || target.module;
                injector = md ? this.reflects.getInjector(md) : this.container;
            };
            options = target;
        }
        let rctx = BuildContext.parse(injector, options);
        await this.reflects.getActionInjector().get(ResolveMoudleScope)
            .execute(rctx);
        return rctx;
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

    protected async execLifeScope<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(
        contextInit: (ctx: T) => void, scope: BuildHandles<T>,
        target: ClassType | Topt | T,
        ...args: string[]): Promise<T> {

        let ctx: T;
        if (target instanceof BootContext) {
            ctx = target as T;
        } else {
            let md: ClassType;
            let injector: ICoreInjector;
            if (isClassType(target)) {
                md = target;
            } else {
                md = target.type || target.module;
                injector = target.injector;
            }
            if (!injector) {
                injector = this.reflects.hasRegister(md) ? this.reflects.getInjector(md) : this.container;
            }
            ctx = injector.getService({ token: BootContext, target: md, default: BootContext }) as T;
            ctx.set(INJECTOR, injector);
            if (isClassType(target)) {
                ctx.setOptions({ type: md, injector: injector });
            } else {
                ctx.setOptions({ ...target, type: md, injector: injector })
            }
        }
        ctx.set(CTX_APP_ENVARGS, args);
        if (contextInit) {
            contextInit(ctx);
        }
        await scope.execute(ctx);
        return ctx;
    }
}
