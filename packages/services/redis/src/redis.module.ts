import { Module } from '@tsdi/ioc';
import { RedisClient } from './client/client';
import { RedisServer } from './server/server';
import { RedisPatternFormatter } from './pattern';
import { RedisConfiguration } from './configuration';



@Module({
    providers: [
        RedisPatternFormatter,
        RedisConfiguration
    ],
    declarations:[
        RedisClient,
        RedisServer
    ]
})
export class RedisModule {

}
