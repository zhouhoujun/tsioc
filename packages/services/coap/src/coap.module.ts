import { Module } from '@tsdi/ioc';
import { CoapClient } from './client/client';
import { CoapServer } from './server/server';
import { CoapStatusVaildator } from './status';
import { CoapConfiguration } from './configuration';



@Module({
    declarations:[
        CoapClient,
        CoapServer,
    ],
    providers: [
        CoapStatusVaildator,
        CoapConfiguration
    ]
})
export class CoapModule {

}
