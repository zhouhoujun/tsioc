import { Handle, Next } from './Handle';
import { HandleContext } from './HandleContext';
import { Abstract, ProviderMap, Type, Token } from '@ts-ioc/ioc';
import { ModuleConfigure, ModuleResovler } from '../modules';
import { IContainer } from '@ts-ioc/core';

/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext extends HandleContext {

    constructor(type: Type<any>, token?: Token<any>) {
        super();
        this.type = type;
        this.token = token;
    }

    /**
     * annoation config.
     *
     * @type {ModuleConfigure}
     * @memberof AnnoationContext
     */
    annoation?: ModuleConfigure;

    /**
     * the annoation module
     *
     * @type {IContainer}
     * @memberof AnnoationContext
     */
    moduleContainer?: IContainer;

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
     * is root module or not.
     *
     * @type {boolean}
     * @memberof AnnoationContext
     */
    isRoot?: boolean;
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
