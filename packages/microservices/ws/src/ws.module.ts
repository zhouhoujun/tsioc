import { Module, token } from '@tsdi/ioc';
import { WsClient } from './client/client';
import { WsServer } from './server/ws-server';

export const WS_SERV_INTERCEPTORS = token<any[]>('WS_SERV_INTERCEPTORS');
export const WS_SERV_FILTERS = token<any[]>('WS_SERV_FILTERS');
export const WS_SERV_GUARDS = token<any[]>('WS_SERV_GUARDS');

@Module({
    providers: [],
    declarations: [
        WsClient,
        WsServer
    ]
})
export class WsModule {

}
