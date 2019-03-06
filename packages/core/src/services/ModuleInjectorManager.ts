import { ModuleInjector, ModuleInjectorType, InjectorContext } from './ModuleInjector';
import { IContainer } from '../IContainer';
import { Type, IocCoreService, PromiseUtil, isClass, lang, Singleton } from '@ts-ioc/ioc';
import { IocExtInjector } from './IocExtInjector';



/**
 * Module Injector chain, base injector chain.
 *
 * @export
 * @class ModuleInjectorChain
 * @implements {ModuleInjectorManager}
 */
@Singleton
export class ModuleInjectorManager extends IocCoreService {

    protected injectors: ModuleInjectorType[];

    constructor() {
        super();
        this.injectors = [];
    }

    registerDefault(container: IContainer) {
        container.registerSingleton(ModuleInjector, () => new ModuleInjector());
        this.use(ModuleInjector)
            .use(IocExtInjector);
    }

    use(injector: ModuleInjectorType): this {
        this.injectors.push(injector);
        return this;
    }

    useBefore(injector: ModuleInjectorType, before: ModuleInjectorType): this {
        this.injectors.splice(this.injectors.indexOf(before) - 1, 0, injector);
        return this;
    }

    useAfter(injector: ModuleInjectorType, after: ModuleInjectorType): this {
        this.injectors.splice(this.injectors.indexOf(after), 0, injector);
        return this;
    }

    first(injector: ModuleInjectorType) {
        this.injectors.unshift(injector);
        return this;
    }

    /**
     * inject module via injector chain.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof ModuleInjectorManager
     */
    async inject(container: IContainer, modules: Type<any>[]): Promise<Type<any>[]> {
        let ctx: InjectorContext = {
            container: container,
            modules: modules,
            injected: []
        };
        await PromiseUtil.runInChain(this.injectors.map(jtor => (ctx: InjectorContext, next?: () => Promise<void>) => {
            if (isClass(jtor)) {
                return container.resolve(jtor).inject(ctx, next);
            } else if (jtor instanceof ModuleInjector) {
                return jtor.inject(ctx, next);
            } else {
                return next();
            }
        }), ctx);
        return ctx.injected || [];
    }

    /**
     * sync inject module via injector chain.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {Type<any>[]}
     * @memberof ModuleInjectorManager
     */
    syncInject(container: IContainer, modules: Type<any>[]): Type<any>[] {
        let ctx: InjectorContext = {
            container: container,
            modules: modules,
            injected: []
        };
        lang.execAction(this.injectors.map(jtor => (ctx: InjectorContext, next?: () => void) => {
            if (isClass(jtor)) {
                return container.resolve(jtor).syncInject(ctx, next);
            } else if (jtor instanceof ModuleInjector) {
                return jtor.syncInject(ctx, next);
            } else {
                return next();
            }
        }), ctx);
        return ctx.injected || [];
    }
}

