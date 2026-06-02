import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import { Producer } from 'kafkajs';
import { KafkaMessageAdapter } from './message-adapter';

@Injectable()
export class KafkaMessageAdapterFactory extends MessageAdapterFactory<Record<string, any>, Producer, KafkaMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<Record<string, any>, Producer>): KafkaMessageAdapter {
        return new KafkaMessageAdapter(options.request, options.response!);
    }
}
