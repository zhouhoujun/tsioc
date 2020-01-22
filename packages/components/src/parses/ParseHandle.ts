import { BuildHandle, BuildHandles } from '@tsdi/boot';
import { IParseContext } from './ParseContext';

/**
 * parse handle.
 *
 * @export
 * @abstract
 * @class ParseHandle
 * @extends {BuildHandle<ParseContext>}
 */
export abstract class ParseHandle extends BuildHandle<IParseContext> {
    /**
     * execute binding Handle.
     *
     * @abstract
     * @param {IParseContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof BootHandle
     */
    abstract execute(ctx: IParseContext, next: () => Promise<void>): Promise<void>;
}

/**
 * parser handles.
 *
 * @export
 * @class ParsersHandle
 * @extends {BuildHandles<IParseContext>}
 */
export class ParsersHandle extends BuildHandles<IParseContext> {

}
