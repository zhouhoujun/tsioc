import { Abstract } from '@tsdi/ioc';
import { BuildHandle } from './BuildHandles';
import { AnnoationContext, IAnnoationContext } from '../AnnoationContext';


/**
 * annoation handle.
 *
 * @export
 * @abstract
 * @class AnnoationHandle
 * @extends {BuildHandle<AnnoationContext>}
 */
@Abstract()
export abstract class AnnoationHandle extends BuildHandle<IAnnoationContext> {
    /**
     * execute Handles.
     *
     * @abstract
     * @param {IAnnoationContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof AnnoationHandle
     */
    abstract execute(ctx: IAnnoationContext, next: () => Promise<void>): Promise<void>;
}
