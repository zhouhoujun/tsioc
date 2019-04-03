import { IocActionContext, Type, ProviderMap, ActionContextOption, isFunction, isClass } from '@tsdi/ioc';
import { ModuleConfigure, ModuleResovler, RegScope } from '../modules';
import { IContainer, isContainer } from '@tsdi/core';

/**
 * annoation action option.
 *
 * @export
 * @interface AnnoationActionOption
 * @extends {ActionContextOption}
 */
export interface AnnoationActionOption extends ActionContextOption {
    /**
     * target module type.
     *
     * @type {Type<any>}
     * @memberof AnnoationActionOption
     */
    targetType: Type<any>;
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
 * @param {(Type<any> | AnnoationActionOption)} target
 * @param {(IContainer | (() => IContainer))} [raiseContainer]
 * @returns {T}
 */
export function createAnnoationContext<T extends AnnoationActionContext>(CtxType: Type<T>, target: Type<any> | AnnoationActionOption, raiseContainer?: IContainer | (() => IContainer)): T {
    let type: Type<any>;
    let options: AnnoationActionOption;
    if (isClass(target)) {
        type = target;
    } else {
        options = target;
        type = target.targetType;
    }
    let ctx = new CtxType(type, raiseContainer);
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
export class AnnoationActionContext extends IocActionContext {

    protected raiseContainerGetter: () => IContainer;

    constructor(type: Type<any>, raiseContainer?: IContainer | (() => IContainer)) {
        super(raiseContainer);
        this.type = type;
    }

    static parse(target: Type<any> | AnnoationActionOption, raiseContainer?: IContainer | (() => IContainer)): AnnoationActionContext {
        return createAnnoationContext(AnnoationActionContext, target, raiseContainer);
    }

    hasRaiseContainer(): boolean {
        return isFunction(this.raiseContainerGetter);
    }

    /**
     * set resolve context.
     *
     * @param {() => IContainer} raiseContainer
     * @memberof IocActionContext
     */
    setRaiseContainer(raiseContainer: IContainer | (() => IContainer)) {
        if (isFunction(raiseContainer)) {
            this.raiseContainerGetter = raiseContainer;
        } else if (isContainer(raiseContainer)) {
            this.raiseContainerGetter = () => raiseContainer;
        }
    }

    getRaiseContainer(): IContainer {
        return super.getRaiseContainer() as IContainer;
    }


    type: Type<any>;

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
    moduleResolver?: ModuleResovler<any>;

    /**
     * the way to register the module. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regScope?: RegScope;
}
