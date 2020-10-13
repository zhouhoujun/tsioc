import { Injectable } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { ProdverOption } from '../Context';
import { DestoryableContext } from '../annotations/ctx';
import { CTX_CURR_INJECTOR } from '../tk';



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
export class MessageContext<T extends MessageOption = MessageOption> extends DestoryableContext<T>  {

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
        return this.options.target;
    }

    /**
     * message type
     *
     * @type {string}
     * @memberof MessageContext
     */
    get type(): string {
        return this.options.type;
    }
    /**
     * message event
     *
     * @type {string}
     * @memberof MessageContext
     */
    get event(): string {
        return this.options.event;
    }

    /**
     * message data.
     *
     * @type {*}
     * @memberof MessageContext
     */
    get data(): any {
        return this.options.data;
    }

    set data(data: any) {
        this.options.data = data;
    }

    protected setOptions(options: T) {
        if (!options) {
            return this;
        }
        return super.setOptions(options);
    }

}


