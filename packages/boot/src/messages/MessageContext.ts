import { Injectable, IocRaiseContext, ActionContextOption, isDefined } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { IHandleContext } from '../handles/Handle';
import { CTX_DATA, CTX_MSG_TARGET, CTX_MSG_TYPE, CTX_MSG_EVENT } from '../context-tokens';


/**
 * message option
 *
 * @export
 * @interface MessageOption
 */
export interface MessageOption extends ActionContextOption {
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
}

/**
 * message context.
 *
 * @export
 * @class MessageContext
 * @extends {HandleContext}
 */
@Injectable
export class MessageContext<T extends MessageOption = MessageOption> extends IocRaiseContext<T, IContainer> implements IHandleContext {

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


