import { token, Provider } from '@tsdi/ioc';
import { ListenOpts, Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';
import * as http from 'node:http';
import * as https from 'node:https';

export interface HttpServOptions extends ServiceOptions {
    transport: Transport.HTTP;
    providers?: Provider[];
    listenOpts?: ListenOpts;
    serverOpts?: http.ServerOptions | https.ServerOptions;
    secure?: boolean;
}

export const HTTP_SERV_OPTIONS = token<HttpServOptions>('HTTP_SERV_OPTIONS');
export const HTTP_BIND_INTERCEPTORS = token<any[]>('HTTP_BIND_INTERCEPTORS');
export const HTTP_BIND_FILTERS = token<any[]>('HTTP_BIND_FILTERS');
export const HTTP_BIND_GUARDS = token<any[]>('HTTP_BIND_GUARDS');
