import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import { NatsConnection } from 'nats';
import { NatsMessageAdapter } from './message-adapter';

@Injectable()
export class NatsMessageAdapterFactory extends MessageAdapterFactory<Record<string, any>, NatsConnection, NatsMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<Record<string, any>, NatsConnection>): NatsMessageAdapter {
        return new NatsMessageAdapter(options.request, options.response!);
    }
}
