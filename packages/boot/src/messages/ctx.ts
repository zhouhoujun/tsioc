import { IInjector, Injectable, Injector } from '@tsdi/ioc';
import { ProdverOption } from '../Context';
import { DestoryableContext } from '../annotations/ctx';



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
     */
    type?: string;
    /**
     * message event
     *
     * @type {string}
     */
    event: string;

    /**
     * message data.
     *
     * @type {*}
     */
    data?: any;

    /**
     * message of target.
     *
     * @type {*}
     */
    target?: any;
    /**
     * custom set conetext injector of message queue.
     */
    injector?: IInjector;
}

/**
 * message context.
 *
 * @export
 * @class MessageContext
 * @extends {HandleContext}
 */
@Injectable()
export class MessageContext<T extends MessageOption = MessageOption> extends DestoryableContext<T>  {

    /**
     * get injector of current message queue.
     */
    getQueueInjector(): IInjector {
        return this.getValue(Injector) ?? this.injector;
    }

    /**
     * message of target.
     *
     * @type {*}
     */
    get target(): any {
        return this.options.target;
    }

    /**
     * message type
     *
     * @type {string}
     */
    get type(): string {
        return this.options.type;
    }
    /**
     * message event
     *
     * @type {string}
     */
    get event(): string {
        return this.options.event;
    }

    /**
     * message data.
     *
     * @type {*}
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


