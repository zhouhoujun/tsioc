import { Injectable, isDefined } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IHandleContext, ProdverOption } from '../Context';
import { DestoryableContext } from '../annotations/ctx';
import { CTX_DATA, CTX_MSG_TARGET, CTX_MSG_TYPE, CTX_MSG_EVENT, CTX_CURR_INJECTOR } from '../tk';



/**
 * message option
 *
 * @export
 * @interface MessageOption
 */
export interface MessageOption extends ProdverOption {
    /**
     * message type
     *
     * @type {string}
     * @memberof MessageContext
     */
    type?: string;
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

    /**
     * message of target.
     *
     * @type {*}
     * @memberof MessageOption
     */
    target?: any;
    /**
     * custom set conetext injector of message queue.
     */
    injector?: ICoreInjector;
}

/**
 * message context.
 *
 * @export
 * @class MessageContext
 * @extends {HandleContext}
 */
@Injectable
export class MessageContext<T extends MessageOption = MessageOption> extends DestoryableContext<T> implements IHandleContext {

    /**
     * get injector of current message queue.
     */
    getQueueInjector(): ICoreInjector {
        return this.getValue(CTX_CURR_INJECTOR) ?? this.injector;
    }

    /**
     * message of target.
     *
     * @type {*}
     * @memberof MessageContext
     */
    get target(): any {
        return this.context.getValue(CTX_MSG_TARGET);
    }

    /**
     * message type
     *
     * @type {string}
     * @memberof MessageContext
     */
    get type(): string {
        return this.context.getValue(CTX_MSG_TYPE);
    }
    /**
     * message event
     *
     * @type {string}
     * @memberof MessageContext
     */
    get event(): string {
        return this.context.getValue(CTX_MSG_EVENT);
    }

    /**
     * message data.
     *
     * @type {*}
     * @memberof MessageContext
     */
    get data(): any {
        return this.context.getValue(CTX_DATA);
    }

    set data(data: any) {
        this.setValue(CTX_DATA, data);
    }

    setOptions(options: T) {
        if (!options) {
            return this;
        }
        if (isDefined(options.data)) {
            this.setValue(CTX_DATA, options.data);
        }
        if (options.target) {
            this.setValue(CTX_MSG_TARGET, options.target)
        }
        if (options.type) {
            this.setValue(CTX_MSG_TYPE, options.type);
        }
        if (options.event) {
            this.setValue(CTX_MSG_EVENT, options.event);
        }
        return super.setOptions(options);
    }

}


