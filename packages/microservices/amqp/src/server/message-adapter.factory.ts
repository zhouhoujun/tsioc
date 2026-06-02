import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import * as amqp from 'amqplib';
import { AmqpMessageAdapter } from './message-adapter';

@Injectable()
export class AmqpMessageAdapterFactory extends MessageAdapterFactory<Record<string, any>, amqp.Channel, AmqpMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<Record<string, any>, amqp.Channel>): AmqpMessageAdapter {
        return new AmqpMessageAdapter(options.request, options.response!);
    }
}
