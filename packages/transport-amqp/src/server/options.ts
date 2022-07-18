import { ServerOpts } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import * as amqp from 'amqplib';

export type amqpURL = string | amqp.Options.Connect;

@Abstract()
export abstract class AmqpOptions extends ServerOpts<any, any> {
    abstract url: amqpURL;
    queue?: string;
    queueOptions?: amqp.Options.AssertQueue;
}
