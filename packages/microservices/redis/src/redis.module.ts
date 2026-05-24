import { Module, token } from '@tsdi/ioc';
import { RedisClient } from './client/client';
import { RedisServer } from './server/redis-server';
import { RedisPatternFormatter } from './server/pattern';

export const REDIS_SERV_INTERCEPTORS = token<any[]>('REDIS_SERV_INTERCEPTORS');
export const REDIS_SERV_FILTERS = token<any[]>('REDIS_SERV_FILTERS');
export const REDIS_SERV_GUARDS = token<any[]>('REDIS_SERV_GUARDS');

@Module({
    providers: [
        RedisPatternFormatter,
    ],
    declarations: [
        RedisClient,
        RedisServer
    ]
})
export class RedisModule {

}
