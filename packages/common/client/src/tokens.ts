import { getToken, Token } from '@tsdi/ioc';
import { Transport, RequestInterceptor, RequestInterceptorLike, RequestHandler } from '@tsdi/common';
import { ClientConfig } from './options';
import { AbstractClient } from './AbstractClient';


function toMicroName(microservice?: boolean, name?: string) {
    if(!name) return microservice? 'MICRO' : '';
    return microservice ? 'MICRO_' + (name ?? '') : name
}

export function getClientInterceptorsToken(transport: Transport, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptor[]>(`${Transport[transport].toUpperCase()}_CLIENT_INTERCEPTORS`, toMicroName(microservice));
}



export function getClientTransfersToken(transport: Transport, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptorLike[]>(`${Transport[transport].toUpperCase()}_CLIENT_TRANSFERS`, toMicroName(microservice));
}



export function getClientOptionsToken(transport: Transport, microservice?: boolean, name?: string): Token<ClientConfig> {
    return getToken<ClientConfig>(`${Transport[transport].toUpperCase()}_CLIENT_OPTIONS`, toMicroName(microservice, name));
}

export function getClientHandlerToken(transport: Transport, microservice?: boolean, name?: string): Token<RequestHandler> {
    return getToken<RequestHandler>(`${Transport[transport].toUpperCase()}_CLIENT_HANDLER`, toMicroName(microservice, name));
}



export function getClientToken(transport: Transport, microservice?: boolean, name?: string): Token<AbstractClient> {
    return getToken<AbstractClient>(`${Transport[transport].toUpperCase()}_CLIENT`, toMicroName(microservice, name));
}
