import { Module } from '@tsdi/ioc';
import { UdpClient } from './client/client';
import { UdpServer } from './server/server';
import { UdpConfiguration } from './configuration';



@Module({
    providers: [
        UdpConfiguration
    ],
    declarations:[
        UdpClient,
        UdpServer
    ]
})
export class UdpModule {

}