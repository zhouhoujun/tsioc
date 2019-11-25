import { Injectable, IocRaiseContext, ActionContextOption, isDefined } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { IHandleContext } from '../handles';
import { CTX_DATA } from '../../context-tokens';


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
        return this.getOptions().target;
    }

    /**
     * message type
     *
     * @type {string}
     * @memberof MessageContext
     */
    get type(): string {
        return this.getOptions().type;
    }
    /**
     * message event
     *
     * @type {string}
     * @memberof MessageContext
     */
    get event(): string {
        return this.getOptions().event;
    }

    /**
     * message data.
     *
     * @type {*}
     * @memberof MessageContext
     */
    get data(): any {
        return this.get(CTX_DATA);
    }

    set data(data: any) {
        this.set(CTX_DATA, data);
    }

    setOptions(options: T) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (isDefined(options.data)) {
            this.set(CTX_DATA, options.data);
        }
    }

}


