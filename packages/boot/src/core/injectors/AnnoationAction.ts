import { IocAction } from '@tsdi/ioc';
import { AnnoationContext } from '../AnnoationContext';

/**
 * annoation.
 *
 * @export
 * @abstract
 * @class AnnoationAction
 * @extends {IocAction<AnnoationContext>}
 */
export abstract class AnnoationAction extends IocAction<AnnoationContext> {
    /**
     * execute annoation action.
     *
     * @abstract
     * @param {AnnoationContext} ctx
     * @param {() => void} next
     * @memberof AnnoationAction
     */
    abstract execute(ctx: AnnoationContext, next: () => void): void;
}
