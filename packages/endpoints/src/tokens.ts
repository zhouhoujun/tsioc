import { getToken, Token } from '@tsdi/ioc';
import { Transport, RequestInterceptor, RequestInterceptorLike } from '@tsdi/common';
import { ServiceConfig } from './server.options';
import { FilterLike } from '@tsdi/core';
import { Router } from './router/router';
import { AbstractRequestHandler } from './AbstractRequestHandler';


function toMicroName(name?: string, microservice?: boolean) {
    return microservice ? 'MICRO_' + (name ?? '') : name
}

export function getFiltersToken(transport: Transport, name?: string, microservice?: boolean): Token<FilterLike[]> {
    return getToken<FilterLike[]>(`${Transport[transport].toUpperCase()}_FILTERS`, toMicroName(name, microservice));
}


export function getInterceptorsToken(transport: Transport, name?: string, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptor[]>(`${Transport[transport].toUpperCase()}_INTERCEPTORS`, toMicroName(name, microservice));
}



export function getTransfersToken(transport: Transport, name?: string, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptorLike[]>(`${Transport[transport].toUpperCase()}_TRANSFERS`, toMicroName(name, microservice));
}


export function getRouterToken(transport: Transport, name?: string, microservice?: boolean): Token<Router> {
    return getToken(Router, Transport[transport] + '_' + toMicroName(name, microservice))
}




export function getServiceOptionsToken(transport: Transport, name?: string, microservice?: boolean): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${Transport[transport].toUpperCase()}_OPTIONS`, toMicroName(name, microservice));
}

export function getServiceHandlerToken(transport: Transport, name?: string, microservice?: boolean): Token<AbstractRequestHandler> {
    return getToken<AbstractRequestHandler>(`${Transport[transport].toUpperCase()}_HANDLER`, toMicroName(name, microservice));
}


export function getServiceToken(transport: Transport, name?: string, microservice?: boolean): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${Transport[transport].toUpperCase()}_SERVICE`, toMicroName(name, microservice));
}
