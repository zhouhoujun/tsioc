import { IBootstrapBuilder, BootstrapBuilderToken } from './IBootstrapBuilder';
import { IocModule } from './ModuleType';
import { Singleton, Token, isToken, IContainer, isClass, lang, getTypeMetadata } from '@ts-ioc/core';
import { ModuleConfiguration } from './ModuleConfiguration';

/**
 * bootstrap base builder.
 *
 * @export
 * @class BootstrapBuilder
 * @implements {IBootstrapBuilder<T>}
 * @template T
 */
@Singleton(BootstrapBuilderToken)
export class BootstrapBuilder<T> implements IBootstrapBuilder<T> {

    constructor() {

    }

    async build(iocModule: IocModule<T>, data?: any): Promise<T> {
        let builder = this.getBuilder(iocModule);
        if (!iocModule.bootstrap) {
            iocModule.bootstrap = builder.getBootstrapToken(iocModule);
        }
        if (!iocModule.bootstrap) {
            throw new Error('cant not find bootstrap token.');
        }
        let container = iocModule.container;
        if (!container) {
            throw new Error('cant not find container.');
        }

        let instance = container.resolve(iocModule.bootstrap, data);
        instance = await builder.buildStrategy(instance, iocModule);
        iocModule.bootInstance = instance;
        return instance;
    }

    getBootstrapToken(iocModule: IocModule<T>): Token<T> {
        return iocModule.bootstrap || iocModule.moduleToken;
    }

    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {IocModule<T>} config
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    async buildStrategy(instance: T, iocModule: IocModule<T>): Promise<T> {
        return instance;
    }

    getBuilder(iocModule: IocModule<T>): IBootstrapBuilder<T> {
        if (!iocModule.bootBuilder) {
            let builder: IBootstrapBuilder<T>;
            if (iocModule.moduleConfig.bootBuilder) {
                builder = this.getBuilderViaConfig(iocModule.moduleConfig.bootBuilder, iocModule.container);
            }
            if (!builder) {
                builder = this;
            }
            iocModule.bootBuilder = builder;
        }
        return iocModule.bootBuilder;
    }

    protected getBuilderViaConfig(builder: Token<IBootstrapBuilder<T>> | IBootstrapBuilder<T>, container: IContainer): IBootstrapBuilder<T> {
        if (isToken(builder)) {
            return container.resolve(builder);
        } else if (builder instanceof BootstrapBuilder) {
            return builder;
        }
        return null;
    }

    // protected getBuilderViaToken(mdl: Token<T>, container: IContainer): IBootstrapBuilder<T> {
    //     if (isToken(mdl)) {
    //         let taskType = isClass(mdl) ? mdl : container.getTokenImpl(mdl);
    //         if (taskType) {
    //             let meta = lang.first(getTypeMetadata<ModuleConfiguration<T>>(this.getDecorator(), taskType));
    //             if (meta && meta.builder) {
    //                 return isToken(meta.builder) ? container.resolve(meta.builder) : meta.builder;
    //             }
    //         }
    //     }
    //     return null;
    // }
}
