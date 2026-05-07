import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';
import { RedisOptions } from 'ioredis';

export interface RedisServOptions extends ServiceOptions {
    transport: Transport.Redis;
    providers?: Provider[];
    url?: string;
    connectOpts?: RedisOptions;
    channels?: string[];
}

export const REDIS_SERV_OPTIONS = token<RedisServOptions>('REDIS_SERV_OPTIONS');
export const REDIS_BIND_INTERCEPTORS = token<any[]>('REDIS_BIND_INTERCEPTORS');
export const REDIS_BIND_FILTERS = token<any[]>('REDIS_BIND_FILTERS');
export const REDIS_BIND_GUARDS = token<any[]>('REDIS_BIND_GUARDS');
