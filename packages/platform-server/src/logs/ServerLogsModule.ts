import { Module } from '@tsdi/core';
import { ServerLogFormater } from './ServerLogFormater';
import { Log4jsAdapter } from './Log4jsAdapter';

@Module({
    regIn: 'root',
    providers: [
        ServerLogFormater,
        Log4jsAdapter
    ]
})
export class ServerLogsModule { }
