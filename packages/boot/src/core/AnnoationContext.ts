import { Type, ProviderMap, ContainerFactory, createRaiseContext, InjectToken, IocProvidersOption, IocProvidersContext } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { ModuleConfigure, RegFor, IModuleResolver, IModuleReflect } from './modules';

/**
 * annoation action option.
 *
 * @export
 * @interface AnnoationOption
 * @extends {ActionContextOption}
 */
export interface AnnoationOption extends IocProvidersOption<IContainer> {
    /**
     * target module type.
     *
     * @type {Type}
     * @memberof AnnoationActionOption
     */
    module?: Type;
    /**
     * module decorator.
     *
     * @type {string}
     * @memberof AnnoationActionOption
     */
    decorator?: string;
}

export const CTX_MODULE_REGFOR = new InjectToken<RegFor>('CTX_MODULE_REGFOR');
export const CTX_MODULE_RESOLVER = new InjectToken<IModuleResolver>('CTX_MODULE_RESOLVER');
export const CTX_MODULE_EXPORTS = new InjectToken<ProviderMap>('CTX_MODULE_EXPORTS');
export const CTX_MODULE_ANNOATION = new InjectToken<ModuleConfigure>('CTX_MODULE_ANNOATION');

/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext extends IocProvidersContext<IContainer> {

    constructor(type?: Type) {
        super();
        this.module = type;
    }

    static parse(target: Type | AnnoationOption, raiseContainer?: ContainerFactory<IContainer>): AnnoationContext {
        return createRaiseContext(AnnoationContext, target, raiseContainer);
    }

    module: Type;

    decorator?: string;

    get targetReflect(): IModuleReflect {
        return this.reflects.get(this.module);
    }

    // /**
    //  * annoation config.
    //  *
    //  * @type {ModuleConfigure}
    //  * @memberof AnnoationContext
    //  */
    // annoation?: ModuleConfigure;

    // /**
    //  * module type exports.
    //  *
    //  * @type {ProviderMap}
    //  * @memberof AnnoationContext
    //  */
    // exports?: ProviderMap;

    // /**
    //  * module resolver.
    //  *
    //  * @type {ModuleResovler}
    //  * @memberof AnnoationContext
    //  */
    // moduleResolver?: IModuleResolver;

    // /**
    //  * the way to register the module. default as child module.
    //  *
    //  * @type {boolean}
    //  * @memberof ModuleConfig
    //  */
    // regFor?: RegFor;


    setOptions(options: AnnoationOption) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.module) {
            this.module = options.module;
        }
        if (options.decorator) {
            this.decorator = options.decorator;
        }
    }
}
