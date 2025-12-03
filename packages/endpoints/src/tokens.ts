import { getToken, Token } from '@tsdi/ioc';
import { Protocols, RequestInterceptor, RequestInterceptorFn, RequestInterceptorLike } from '@tsdi/common';
import { ServiceConfig } from './server.options';
import { FilterLike } from '@tsdi/core';
import { Router } from './router/router';
import { AbstractRequestHandler } from './AbstractRequestHandler';


export function getFiltersToken(protocol: Protocols, name?: string): Token<FilterLike[]> {
    return getToken<FilterLike[]>(`${protocol.toUpperCase()}_FILTERS`, name);
}


export function getInterceptorsToken(protocol: Protocols, name?: string): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptor[]>(`${protocol.toUpperCase()}_INTERCEPTORS`, name);
}

// export function getInterceptorFnsToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn[]> {
//     return getToken<RequestInterceptorFn[]>(`${protocol.toUpperCase()}_INTERCEPTOR_FNS`, name);
// }


// export function getLegacyInterceptorToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn> {
//     return getToken<RequestInterceptorFn>(`${protocol.toUpperCase()}_LEGACY_INTERCEPTOR_FN`, name);
// }


export function getTransfersToken(protocol: Protocols, name?: string): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptorLike[]>(`${protocol.toUpperCase()}_TRANSFERS`, name);
}


export function getRouterToken(protocol: Protocols, microservice?: boolean,  name?: string): Token<Router> {
    return getToken(microservice ? 'MicroRouter' : Router, protocol)
}




export function getServiceOptionsToken(protocol: Protocols, name?: string): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${protocol.toUpperCase()}_OPTIONS`, name);
}

export function getServiceHanlderToken(protocol: Protocols, name?: string): Token<AbstractRequestHandler> {
    return getToken<AbstractRequestHandler>(`${protocol.toUpperCase()}_HANDLER`, name);
}


export function getServiceToken(protocol: Protocols, name?: string): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${protocol.toUpperCase()}_SERVICE`, name);
}
