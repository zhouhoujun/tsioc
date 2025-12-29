import { getToken, Invocation, Token } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import { Transport, RequestInterceptorLike, RequestHandlerLike, RequestFilterLike } from '@tsdi/common';
import { ServiceConfig } from './server.options';
import { Router } from './router/router';
import { ServiceHandler } from './ServiceHandler';
import { MiddlewareLike } from './middleware/middleware';

function toMicroName(microservice?: boolean, name?: string) {
    if(!name) return microservice? 'MICRO' : '';
    return microservice ? 'MICRO_' + (name ?? '') : name
}

export function getGuardsToken(config: ServiceConfig): Token<GuardLike[]> {
    if(!config.guardsToken) {
        config.guardsToken = getToken<GuardLike[]>(`${Transport[config.transport].toUpperCase()}_GUARDS`, toMicroName(config.microservice));
    }
    return config.guardsToken;
}

export function getFiltersToken(config: ServiceConfig): Token<RequestFilterLike[]> {
    if(!config.filtersToken) {
        config.filtersToken = getToken<RequestFilterLike[]>(`${Transport[config.transport].toUpperCase()}_FILTERS`, toMicroName(config.microservice));
    }
    return config.filtersToken;
}


export function getInterceptorsToken(config: ServiceConfig): Token<RequestInterceptorLike[]> {
    if(!config.interceptorsToken) {
        config.interceptorsToken = getToken<RequestInterceptorLike[]>(`${Transport[config.transport].toUpperCase()}_INTERCEPTORS`, toMicroName(config.microservice));
    }
    return config.interceptorsToken;
}

export function getMiddlewaresToken(config: ServiceConfig): Token<MiddlewareLike[]> {
    if(!config.middlewaresToken) {
        config.middlewaresToken = getToken<MiddlewareLike[]>(`${Transport[config.transport].toUpperCase()}_MIDDLEWARES`, toMicroName(config.microservice));
    }
    return config.middlewaresToken;
}


export function getTransfersToken(config: ServiceConfig): Token<RequestInterceptorLike[]> {
    if(!config.transfersToken) {
        config.transfersToken = getToken<RequestInterceptorLike[]>(`${Transport[config.transport].toUpperCase()}_TRANSFERS`, toMicroName(config.microservice));
    }
    return config.transfersToken;
}


export function getRouterToken(config: ServiceConfig): Token<Router> {
    if(!config.routerToken) {
        config.routerToken = getToken(Router, Transport[config.transport] + '_' + toMicroName(config.microservice));
    }
    return config.routerToken;
}




export function getServiceOptionsToken(config: ServiceConfig): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${Transport[config.transport].toUpperCase()}_OPTIONS`, toMicroName(config.microservice, config.name));
}

export function getServiceHandlerToken(config: ServiceConfig): Token<ServiceHandler> {
    return getToken<ServiceHandler>(`${Transport[config.transport].toUpperCase()}_HANDLER`, toMicroName(config.microservice, config.name));
}

export function getServiceBackendToken(config: ServiceConfig): Token<RequestHandlerLike> {
    if(!config.backendToken) {
        config.backendToken = getToken<RequestHandlerLike>(`${Transport[config.transport].toUpperCase()}_BACKEND`, toMicroName(config.microservice, config.name));
    }
    return config.backendToken;
}


export function getServiceToken<T>(config: ServiceConfig): Token<Invocation<T>> {
    return getToken<Invocation<T>>(`${Transport[config.transport].toUpperCase()}_SERVICE`, toMicroName(config.microservice, config.name));
}
