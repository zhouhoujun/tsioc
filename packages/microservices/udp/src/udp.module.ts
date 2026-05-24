import { Module, token } from '@tsdi/ioc';
import { UdpClient } from './client/client';
import { UdpServer } from './server/udp-server';

export const UDP_SERV_INTERCEPTORS = token<any[]>('UDP_SERV_INTERCEPTORS');
export const UDP_SERV_FILTERS = token<any[]>('UDP_SERV_FILTERS');
export const UDP_SERV_GUARDS = token<any[]>('UDP_SERV_GUARDS');

@Module({
    providers: [],
    declarations: [
        UdpClient,
        UdpServer
    ]
})
export class UdpModule {

}
