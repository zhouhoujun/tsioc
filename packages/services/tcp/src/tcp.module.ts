import { Module } from '@tsdi/ioc';
import { TcpClient } from './client/client';
import { TcpServer } from './server/server';
import { TcpConfiguration } from './configuration';



@Module({
    providers: [
        TcpClient,
        TcpServer,
        TcpConfiguration
    ]
})
export class TcpModule {

}
