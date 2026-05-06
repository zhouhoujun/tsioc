import { tokenId } from '@tsdi/ioc';
import { Filter, ApplicationInterceptor } from '@tsdi/core';
import { ResponseEvent } from '@tsdi/common';
import { ClientConfig } from '@tsdi/common/client';
import { TransportConfigure } from '@tsdi/transport';
import { ClientOptions } from 'ws';
import { WsRequest } from './request';

/**
 * ws client config.
 */
export interface WsClientConfig extends ClientConfig<ClientOptions> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url?: string;
    enableStream?: boolean;
    streamTransport?: TransportConfigure;
}

/**
 * WS client interceptors.
 */
export const WS_CLIENT_INTERCEPTORS = tokenId<ApplicationInterceptor<WsRequest<any>, ResponseEvent<any>>[]>('WS_CLIENT_INTERCEPTORS');
/**
 * WS client filters.
 */
export const WS_CLIENT_FILTERS = tokenId<Filter[]>('WS_CLIENT_FILTERS');


