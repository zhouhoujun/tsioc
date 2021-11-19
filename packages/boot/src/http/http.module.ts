import { Module } from '@tsdi/core';
import { HttpStartupService } from './serv';


@Module({
    providers: [
        HttpStartupService
    ]
})
export class HttpModule { }