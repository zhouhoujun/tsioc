import { Handle, CompositeHandle } from '../../core';
import { ParseContext } from './ParseContext';

export abstract class ParseHandle extends Handle<ParseContext> {
    /**
     * execute binding Handle.
     *
     * @abstract
     * @param {ParseContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof BootHandle
     */
    abstract execute(ctx: ParseContext, next: () => Promise<void>): Promise<void>;
}

export class CompositeParserHandle extends CompositeHandle<ParseContext> {

}
