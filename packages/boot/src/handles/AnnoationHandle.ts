import { Handle, Next } from './Handle';
import { BootContext } from '../BootContext';
import { AnnotationConfigure } from '../annotations';
import { Abstract } from '@ts-ioc/ioc';


export class AnnoationContext extends BootContext {
    /**
     * annoation config.
     *
     * @type {AnnotationConfigure<any>}
     * @memberof AnnoationContext
     */
    annoation?: AnnotationConfigure<any>;
}

/**
 * annoation handle.
 *
 * @export
 * @abstract
 * @class AnnoationMiddleware
 * @extends {Middleware<AnnoationContext>}
 */
@Abstract()
export abstract class AnnoationHandle extends Handle<AnnoationContext> {
    /**
     * execute middleware.
     *
     * @abstract
     * @param {AnnoationContext} ctx
     * @param {Next} next
     * @returns {Promise<void>}
     * @memberof AnnoationMiddleware
     */
    abstract execute(ctx: AnnoationContext, next: Next): Promise<void>;
}
