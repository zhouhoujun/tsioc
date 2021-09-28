import { Module } from '@tsdi/core';
import { Http2StartupService } from './serv';


@Module({
    regIn: 'root',
    providers: [
        Http2StartupService
    ]
})
export class Http2Module { }