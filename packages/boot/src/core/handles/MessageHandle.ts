import { Handle, IHandleContext } from './Handle';
import { Abstract, isFunction } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';

/**
 * message context.
 *
 * @export
 * @class MessageContext
 * @extends {HandleContext}
 */
export class MessageContext implements IHandleContext {
    protected raiseContainerGetter: () => IContainer;

    constructor(raseContainer: IContainer | (() => IContainer)) {
        this.raiseContainerGetter = isFunction(raseContainer) ? raseContainer : () => raseContainer;
    }

    getRaiseContainer(): IContainer {
        return this.raiseContainerGetter();
    }
    /**
     * message data.
     *
     * @type {*}
     * @memberof MessageContext
     */
    data?: any;
}

/**
 * message handle.
 *
 * @export
 * @abstract
 * @class AnnoationMiddleware
 * @extends {Middleware<MessageContext>}
 */
@Abstract()
export abstract class MessageHandle extends Handle<MessageContext> {
    /**
     * execute middleware.
     *
     * @abstract
     * @param {MessageContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof AnnoationMiddleware
     */
    abstract execute(ctx: MessageContext, next: () => Promise<void>): Promise<void>;
}
