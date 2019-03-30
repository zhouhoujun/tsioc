import { Handle, Next } from '../core';
import { Abstract } from '@tsdi/ioc';
import { BootContext } from '../BootContext';

/**
 * annoation handle.
 *
 * @export
 * @abstract
 * @class BootHandle
 * @extends {Handle<BootContext>}
 */
@Abstract()
export abstract class BootHandle extends Handle<BootContext> {
    /**
     * execute boot Handle.
     *
     * @abstract
     * @param {AnnoationContext} ctx
     * @param {Next} next
     * @returns {Promise<void>}
     * @memberof BootHandle
     */
    abstract execute(ctx: BootContext, next: Next): Promise<void>;
}
