import { IocCoreService, Type, Inject, Singleton, isClass, Autorun, ProviderTypes, InjectReference, isFunction, MetadataService, getOwnTypeMetadata } from '@tsdi/ioc';
import { BootContext, BootOption, BootTargetToken } from '../BootContext';
import { IContainer, ContainerToken, isContainer } from '@tsdi/core';
import { CompositeHandle, HandleRegisterer } from '../core';
import { ModuleBuilderLifeScope, RunnableBuildLifeScope, ResolveMoudleScope, BuildContext, IModuleResolveOption, BootLifeScope } from '../builder';
import { BootApplication } from '../BootApplication';
import { RunnableConfigure } from '../annotations';



/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 * @extends {IocCoreService}
 */
@Singleton()
@Autorun('setup')
export class BuilderService extends IocCoreService {

    @Inject(ContainerToken)
    protected container: IContainer;

    setup() {
        this.container.get(HandleRegisterer)
            .register(this.container, ResolveMoudleScope, true)
            .register(this.container, ModuleBuilderLifeScope, true)
            .register(this.container, RunnableBuildLifeScope, true)
            .register(this.container, BootLifeScope, true);
    }

    /**
     * binding resolve.
     *
     * @template T
     * @param {Type<any>} target
     * @param {IModuleResolveOption} options
     * @param {(IContainer | ProviderTypes)} [container]
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async resolve<T>(target: Type<any>, options: IModuleResolveOption, container?: IContainer | ProviderTypes, ...providers: ProviderTypes[]): Promise<T> {
        let raiseContainer: IContainer;
        if (isContainer(container)) {
            raiseContainer = container;
        } else {
            providers.unshift(container as ProviderTypes);
            raiseContainer = this.container;
        }
        let rctx = BuildContext.parse(target, options, raiseContainer);
        if (providers.length) {
            rctx.providers = (rctx.providers || []).concat(providers);
        }
        await this.container.get(ResolveMoudleScope)
            .execute(rctx);
        return rctx.target;
    }

    async create<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<any> {
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
        return this.execLifeScope(null, this.container.get(ModuleBuilderLifeScope), target, ...args);
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
        return this.execLifeScope(null, this.container.get(RunnableBuildLifeScope), target, ...args);
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
    async boot(application: BootApplication, ...args: string[]): Promise<BootContext> {
        if (isClass(application.target)) {
            let target = application.target;
            await Promise.all(this.container.get(MetadataService)
                .getClassDecorators(target)
                .map(async d => {
                    let metas = getOwnTypeMetadata<RunnableConfigure>(d, target);
                    if (metas && metas.length) {
                        await Promise.all(metas.filter(m => m && m.deps && m.deps.length > 0).map(m => this.container.load(m.deps)));
                    }
                }));
        } else if (application.target.deps) {
            await this.container.load(...application.target.deps);
        }
        return await this.execLifeScope(application, this.container.get(BootLifeScope), application.target, ...args);
    }

    protected async execLifeScope<T extends BootContext>(application: BootApplication, scope: CompositeHandle<BootContext>, target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
        let ctx: BootContext;
        if (target instanceof BootContext) {
            ctx = target;
            if (!ctx.hasRaiseContainer()) {
                ctx.setRaiseContainer(this.container);
            }
        } else {
            let md = isClass(target) ? target : target.module;
            ctx = this.container.getService(BootContext, md, { provide: BootTargetToken, useValue: md });
            if (!isClass(target)) {
                ctx.setOptions(target);
            }
        }

        ctx.args = args;
        if (application) {
            this.container.bindProvider(new InjectReference(BootApplication, ctx.module), application);
            if (isFunction(application.onContextInit)) {
                application.onContextInit(ctx);
            }
        }
        await scope.execute(ctx);
        return ctx as T;
    }
}
