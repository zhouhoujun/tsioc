import { Module, token } from '@tsdi/ioc';
import { TcpClient } from './client/client';
import { TcpServer } from './server/tcp-server';

export const TCP_SERV_INTERCEPTORS = token<any[]>('TCP_SERV_INTERCEPTORS');
export const TCP_SERV_FILTERS = token<any[]>('TCP_SERV_FILTERS');
export const TCP_SERV_GUARDS = token<any[]>('TCP_SERV_GUARDS');

@Module({
    providers: [],
    declarations: [
        TcpClient,
        TcpServer
    ]
})
export class TcpModule {

}
