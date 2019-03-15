import { Middleware, Next } from '../middlewares';
import { BootContext } from '../BootContext';
import { AnnotationConfigure } from '@ts-ioc/bootstrap';
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
 * annoation middlewate.
 *
 * @export
 * @abstract
 * @class AnnoationMiddleware
 * @extends {Middleware<AnnoationContext>}
 */
@Abstract()
export abstract class AnnoationMiddleware extends Middleware<AnnoationContext> {
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
