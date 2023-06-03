import { TransportSessionOpts } from '@tsdi/core';
import * as amqp from 'amqplib';


export interface AmqpSessionOpts extends  TransportSessionOpts {
    /**
    * queue name
    */
    queue?: string;
    /**
     * queue options.
     */
    queueOpts?: amqp.Options.AssertQueue;
    replyQueue?: string;
    persistent?: boolean;
    noAssert?: boolean;
    prefetchCount?: number;
    prefetchGlobal?: boolean;
    consumeOpts?: amqp.Options.Consume;
}
