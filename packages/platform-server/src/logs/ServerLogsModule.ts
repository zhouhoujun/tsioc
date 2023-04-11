import { Module } from '@tsdi/ioc';
import { ServerJoinpointLogFormater } from './ServerLogFormater';
import { Log4jsAdapter } from './Log4jsAdapter';

@Module({
    providers: [
        ServerJoinpointLogFormater,
        Log4jsAdapter
    ]
})
export class ServerLogsModule { }
