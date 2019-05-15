import { Handle } from './Handle';
import { Abstract, ProviderMap, Type, ContainerFactory } from '@tsdi/ioc';
import { ModuleConfigure, IModuleResolver, RegScope } from '../modules';
import { AnnoationActionContext, AnnoationActionOption, createAnnoationContext } from '../injectors';


/**
 * annation option.
 *
 * @export
 * @interface AnnoationOption
 * @extends {AnnoationActionOption}
 */
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

    static parse(target: Type<any> | AnnoationOption, raiseContainer?: ContainerFactory): AnnoationContext {
        return createAnnoationContext(AnnoationContext, target, raiseContainer);
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
    moduleResolver?: IModuleResolver;

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
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof AnnoationHandle
     */
    abstract execute(ctx: AnnoationContext, next: () => Promise<void>): Promise<void>;
}
