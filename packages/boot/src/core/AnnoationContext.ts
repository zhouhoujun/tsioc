import { IocActionContext, Type, ProviderMap, ActionContextOption, isFunction, isClass, Inject, ContainerFactory } from '@tsdi/ioc';
import { ModuleConfigure, RegFor, IModuleResolver } from './modules';
import { IContainer } from '@tsdi/core';

/**
 * annoation action option.
 *
 * @export
 * @interface AnnoationOption
 * @extends {ActionContextOption}
 */
export interface AnnoationOption extends ActionContextOption {
    /**
     * target module type.
     *
     * @type {Type<any>}
     * @memberof AnnoationActionOption
     */
    module?: Type<any>;
    /**
     * module decorator.
     *
     * @type {string}
     * @memberof AnnoationActionOption
     */
    decorator?: string;
}

/**
 * create annoation context.
 *
 * @export
 * @template T
 * @param {Type<T>} CtxType
 * @param {(Type<any> | AnnoationOption)} target
 * @param {(IContainer | (() => IContainer))} [raiseContainer]
 * @returns {T}
 */
export function createAnnoationContext<T extends AnnoationContext>(CtxType: Type<T>, target: Type<any> | AnnoationOption, raiseContainer?: ContainerFactory): T {
    let type: Type<any>;
    let options: AnnoationOption;
    if (isClass(target)) {
        type = target;
    } else {
        options = target;
        type = target.module;
    }
    let ctx = new CtxType(type);
    raiseContainer && ctx.setRaiseContainer(raiseContainer);
    options && ctx.setOptions(options);
    return ctx;
}

/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext extends IocActionContext {

    constructor(type: Type<any>) {
        super();
        this.module = type;
    }

    static parse(target: Type<any> | AnnoationOption, raiseContainer?: ContainerFactory): AnnoationContext {
        return createAnnoationContext(AnnoationContext, target, raiseContainer);
    }

    hasRaiseContainer(): boolean {
        return isFunction(this.raiseContainerGetter);
    }

    getRaiseContainer(): IContainer {
        return super.getRaiseContainer() as IContainer;
    }


    module: Type<any>;

    decorator?: string;

    /**
     * annoation config.
     *
     * @type {ModuleConfigure}
     * @memberof AnnoationContext
     */
    annoation?: ModuleConfigure;

    /**
     * module type exports.
     *
     * @type {ProviderMap}
     * @memberof AnnoationContext
     */
    exports?: ProviderMap;

    /**
     * module resolver.
     *
     * @type {ModuleResovler}
     * @memberof AnnoationContext
     */
    moduleResolver?: IModuleResolver;

    /**
     * the way to register the module. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regScope?: RegFor;
}
