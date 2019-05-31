import { IHandleContext } from '../handles';
import { isFunction, Injectable, Inject, ContainerFactoryToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';

/**
 * message context.
 *
 * @export
 * @class MessageContext
 * @extends {HandleContext}
 */
@Injectable
export class MessageContext implements IHandleContext {

    @Inject(ContainerFactoryToken)
    protected raiseContainerGetter: () => IContainer;

    constructor(raseContainer?: IContainer | (() => IContainer)) {
        if (raseContainer) {
            this.raiseContainerGetter = isFunction(raseContainer) ? raseContainer : () => raseContainer;
        }
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
