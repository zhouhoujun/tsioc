import { Module } from '@tsdi/ioc';
import { TcpClient } from './client/client';
import { TcpServer } from './server/server';
import { TcpConfiguration } from './configuration';



@Module({
    providers: [
        TcpConfiguration
    ],
    declarations: [
        TcpClient,
        TcpServer
    ]
})
export class TcpModule {

}
