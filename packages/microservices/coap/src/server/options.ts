import { token, Provider } from '@tsdi/ioc';
import { ListenOpts, Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';

export interface CoapServOptions extends ServiceOptions {
    transport: Transport.CoAP;
    providers?: Provider[];
    compatibility?: boolean;
    listenOpts?: ListenOpts;
}

export const COAP_SERV_OPTIONS = token<CoapServOptions>('COAP_SERV_OPTIONS');
export const COAP_BIND_INTERCEPTORS = token<any[]>('COAP_BIND_INTERCEPTORS');
export const COAP_BIND_FILTERS = token<any[]>('COAP_BIND_FILTERS');
export const COAP_BIND_GUARDS = token<any[]>('COAP_BIND_GUARDS');
