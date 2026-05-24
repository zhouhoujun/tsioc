import { Module, token } from '@tsdi/ioc';
import { CoapClient } from './client/client';
import { CoapServer } from './server/coap-server';

export const COAP_SERV_INTERCEPTORS = token<any[]>('COAP_SERV_INTERCEPTORS');
export const COAP_SERV_FILTERS = token<any[]>('COAP_SERV_FILTERS');
export const COAP_SERV_GUARDS = token<any[]>('COAP_SERV_GUARDS');

@Module({
    providers: [],
    declarations: [
        CoapClient,
        CoapServer
    ]
})
export class CoapModule {

}
