import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import Redis from 'ioredis';
import { RedisMessageAdapter } from './message-adapter';

@Injectable()
export class RedisMessageAdapterFactory extends MessageAdapterFactory<Record<string, any>, Redis, RedisMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<Record<string, any>, Redis>): RedisMessageAdapter {
        return new RedisMessageAdapter(options.request, options.response!);
    }
}
