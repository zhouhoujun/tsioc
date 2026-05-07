import { token, Provider } from '@tsdi/ioc';
import { ListenOpts, Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';

export interface UdpServOptions extends ServiceOptions {
    transport: Transport.UDP;
    providers?: Provider[];
    listenOpts?: ListenOpts;
}

export const UDP_SERV_OPTIONS = token<UdpServOptions>('UDP_SERV_OPTIONS');
export const UDP_BIND_INTERCEPTORS = token<any[]>('UDP_BIND_INTERCEPTORS');
export const UDP_BIND_FILTERS = token<any[]>('UDP_BIND_FILTERS');
export const UDP_BIND_GUARDS = token<any[]>('UDP_BIND_GUARDS');
