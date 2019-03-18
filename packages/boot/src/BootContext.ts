import { AnnoationContext } from './core';
import { RunnableConfigure, BootOptions } from './annotations';

/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class BootContext extends AnnoationContext {
    /**
     * boot options.
     *
     * @type {BootOptions}
     * @memberof BootContext
     */
    options?: BootOptions;
    /**
     * annoation config.
     *
     * @type {AnnotationConfigure<any>}
     * @memberof AnnoationContext
     */
    annoation?: RunnableConfigure;

    /**
     * bootstrap instance.
     *
     * @type {T}
     * @memberof RunnableOptions
     */
    instance: any;

    /**
     *  custom boot data of `BuildOptions`
     *
     * @type {*}
     * @memberof RunnableOptions
     */
    data?: any;
}
