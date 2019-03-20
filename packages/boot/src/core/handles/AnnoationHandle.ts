import { Handle, Next } from './Handle';
import { HandleContext, HandleOption } from './HandleContext';
import { Abstract, ProviderMap, Type, isFunction } from '@ts-ioc/ioc';
import { ModuleConfigure, ModuleResovler, RegScope } from '../modules';
import { IContainer, isContainer } from '@ts-ioc/core';


export interface AnnoationOption extends HandleOption {
    /**
     * annoation config.
     *
     * @type {ModuleConfigure}
     * @memberof AnnoationContext
     */
    annoation?: ModuleConfigure;

    /**
     * the way to register the module. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regScope?: RegScope;

    /**
     * the annoation module
     *
     * @type {IContainer}
     * @memberof AnnoationContext
     */
    moduleContainerGetter?: () => IContainer;
}

/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext extends HandleContext {

    constructor(type: Type<any>) {
        super();
        this.type = type;
    }

    static parse(type: Type<any>, options?: AnnoationOption): AnnoationContext {
        let ctx = new AnnoationContext(type);
        options && ctx.setOptions(options);
        return ctx;
    }

    private moduleContainerGetter: () => IContainer;
    /**
     * has module container.
     *
     * @returns {boolean}
     * @memberof AnnoationContext
     */
    hasModuleContainer(): boolean {
        return isFunction(this.moduleContainerGetter);
    }
    /**
     * the annoation module
     *
     * @type {IContainer}
     * @memberof AnnoationContext
     */
    getModuleContainer(): IContainer {
        if (this.moduleContainerGetter) {
            return this.moduleContainerGetter();
        } else {
            throw new Error('has not setting module container.')
        }
    }

    setModuleContainer(container: IContainer | (() => IContainer)) {
        if (isFunction(container)) {
            this.moduleContainerGetter = container;
        } else if (isContainer(container)) {
            this.moduleContainerGetter = () => container;
        }
    }

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

/**
 * annoation handle.
 *
 * @export
 * @abstract
 * @class AnnoationHandle
 * @extends {Handle<AnnoationContext>}
 */
@Abstract()
export abstract class AnnoationHandle extends Handle<AnnoationContext> {
    /**
     * execute Handles.
     *
     * @abstract
     * @param {AnnoationContext} ctx
     * @param {Next} next
     * @returns {Promise<void>}
     * @memberof AnnoationHandle
     */
    abstract execute(ctx: AnnoationContext, next: Next): Promise<void>;
}
