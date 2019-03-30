import { IocActionContext, Type, ProviderMap, ActionContextOption, isFunction } from '@tsdi/ioc';
import { ModuleConfigure, ModuleResovler, RegScope } from '../modules';
import { IContainer, isContainer } from '@tsdi/core';

export interface AnnoationActionOption extends ActionContextOption {
    type: Type<any>;
    decorator?: string;
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

    static parse(options: AnnoationActionOption, raiseContainer?: IContainer | (() => IContainer)): AnnoationActionContext {
        let ctx = new AnnoationActionContext(options.type, raiseContainer);
        options && ctx.setOptions(options);
        return ctx;
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
