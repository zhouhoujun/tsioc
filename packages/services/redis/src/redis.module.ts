import { Module } from '@tsdi/ioc';
import { RedisClient } from './client/client';
import { RedisServer } from './server/server';
import { RedisPatternFormatter } from './pattern';
import { RedisConfiguration } from './configuration';



@Module({
    providers: [
        RedisClient,
        RedisServer,
        RedisPatternFormatter,
        RedisConfiguration
    ]
})
export class RedisModule {

}
