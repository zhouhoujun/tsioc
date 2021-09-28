import { Module } from '@tsdi/core';
import { HttpStartupService } from './serv';


@Module({
    regIn: 'root',
    providers: [
        HttpStartupService
    ]
})
export class HttpModule { }