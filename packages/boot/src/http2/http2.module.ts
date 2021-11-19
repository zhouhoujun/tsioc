import { Module } from '@tsdi/core';
import { Http2StartupService } from './serv';


@Module({
    providers: [
        Http2StartupService
    ]
})
export class Http2Module { }