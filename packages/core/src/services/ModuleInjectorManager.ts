import { ModuleInjector, ModuleInjectorType } from './ModuleInjector';
import { IContainer } from '../IContainer';
import { Type, IocCoreService, PromiseUtil, isClass } from '@ts-ioc/ioc';
import { InjectorContext } from './InjectorContext';



/**
 * Module Injector chain, base injector chain.
 *
 * @export
 * @class ModuleInjectorChain
 * @implements {ModuleInjectorManager}
 */
export class ModuleInjectorManager extends IocCoreService {

    protected injectors: ModuleInjectorType[];

    constructor() {
        super();
        this.injectors = [];
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

    first(injector: ModuleInjector) {
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
            modules: modules
        };
        await PromiseUtil.runInChain(this.injectors.map(jtor => (ctx: InjectorContext, next?: () => Promise<void>) => {
            if (isClass(jtor)) {
                return container.resolve(jtor).inject(ctx, next);
            }  else if (jtor instanceof ModuleInjector) {
                return jtor.inject(ctx, next);
            } else {
                return next();
            }
        }), ctx);
        return ctx.injected || [];
    }
}

