import { Handle, Next } from './Handle';
import { Abstract, ProviderMap, Type } from '@tsdi/ioc';
import { ModuleConfigure, ModuleResovler, RegScope } from '../modules';
import { AnnoationActionContext, AnnoationActionOption } from '../injectors';
import { IContainer } from '@tsdi/core';


export interface AnnoationOption extends AnnoationActionOption {
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

}

/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext extends AnnoationActionContext {

    static parse(options: AnnoationOption, raiseContainer?: IContainer | (() => IContainer)): AnnoationContext {
        let ctx = new AnnoationContext(options.type, raiseContainer);
        options && ctx.setOptions(options);
        return ctx;
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
