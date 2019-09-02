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
    abstract execute(ctx: AnnoationContext, next: () => void): void;
}
