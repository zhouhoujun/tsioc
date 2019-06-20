import { IHandleContext } from '../handles';
import { isFunction, Injectable, Inject, ContainerFactoryToken, InjectToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';

/**
 * token of message event name
 */
export const MsgEventToken = new InjectToken<string>('message_event_name');
/**
 * token of message event data
 */
export const MsgDataToken = new InjectToken<any>('message_event_data');

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

    constructor(@Inject(MsgEventToken) event: string, @Inject(MsgDataToken) data: any, raseContainer?: IContainer | (() => IContainer)) {
        this.event = event;
        this.data = data;
        if (raseContainer) {
            this.raiseContainerGetter = isFunction(raseContainer) ? raseContainer : () => raseContainer;
        }
    }

    getRaiseContainer(): IContainer {
        return this.raiseContainerGetter();
    }

    /**
     * message event
     *
     * @type {string}
     * @memberof MessageContext
     */
    event: string;

    /**
     * message data.
     *
     * @type {*}
     * @memberof MessageContext
     */
    data?: any;
}


