import { TransportSessionOpts } from '@tsdi/transport';
import { Options } from 'amqplib';


export interface AmqpSessionOpts extends TransportSessionOpts {
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
