import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';

export interface NatsServOptions extends ServiceOptions {
    transport: Transport.NATS;
    providers?: Provider[];
    url?: string;
    servers?: string[];
    subjects?: string[];
    queue?: string;
}

export const NATS_SERV_OPTIONS = token<NatsServOptions>('NATS_SERV_OPTIONS');
export const NATS_BIND_INTERCEPTORS = token<any[]>('NATS_BIND_INTERCEPTORS');
export const NATS_BIND_FILTERS = token<any[]>('NATS_BIND_FILTERS');
export const NATS_BIND_GUARDS = token<any[]>('NATS_BIND_GUARDS');
