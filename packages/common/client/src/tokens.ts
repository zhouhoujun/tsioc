import { getToken, Token } from '@tsdi/ioc';
import { Transport, RequestInterceptor, RequestInterceptorLike, RequestHandler } from '@tsdi/common';
// import { ClientOptions } from './client.options';
import { ClientConfig } from './options';
import { AbstractClient } from './AbstractClient';


function toMicroName(name?: string, microservice?: boolean) {
    return microservice ? 'MICRO_' + (name ?? '') : name
}

export function getClientInterceptorsToken(transport: Transport, name?: string, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptor[]>(`${Transport[transport].toUpperCase()}_CLIENT_INTERCEPTORS`, toMicroName(name, microservice));
}

// export function getInterceptorFnsToken(transport: Transport, name?: string): Token<RequestInterceptorFn[]> {
//     return getToken<RequestInterceptorFn[]>(`${transport.toUpperCase()}_INTERCEPTOR_FNS`, name);
// }


// export function getLegacyInterceptorToken(transport: Transport, name?: string): Token<RequestInterceptorFn> {
//     return getToken<RequestInterceptorFn>(`${transport.toUpperCase()}_LEGACY_INTERCEPTOR_FN`, name);
// }


export function getClientTransfersToken(transport: Transport, name?: string, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptorLike[]>(`${Transport[transport].toUpperCase()}_CLIENT_TRANSFERS`, toMicroName(name, microservice));
}



export function getClientOptionsToken(transport: Transport, name?: string, microservice?: boolean): Token<ClientConfig> {
    return getToken<ClientConfig>(`${Transport[transport].toUpperCase()}_CLIENT_OPTIONS`, toMicroName(name, microservice));
}

export function getClientHanlderToken(transport: Transport, name?: string, microservice?: boolean): Token<RequestHandler> {
    return getToken<RequestHandler>(`${Transport[transport].toUpperCase()}_CLIENT_HANDLER`, toMicroName(name, microservice));
}



export function getClientToken(transport: Transport, name?: string, microservice?: boolean): Token<AbstractClient> {
    return getToken<AbstractClient>(`${Transport[transport].toUpperCase()}_CLIENT`, toMicroName(name, microservice));
}
