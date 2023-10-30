import { TransportOpts } from '@tsdi/common';
import { Options } from 'amqplib';


export interface AmqpSessionOpts extends TransportOpts {
    /**
    * queue name
    */
    queue?: string;
    /**
     * queue options.
     */
    queueOpts?: Options.AssertQueue;
    replyQueue?: string;
    persistent?: boolean;
    noAssert?: boolean;
    prefetchCount?: number;
    prefetchGlobal?: boolean;
    consumeOpts?: Options.Consume;
    publishOpts?: Options.Publish;
}
