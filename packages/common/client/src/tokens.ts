import { getToken, Token } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import { Transport, RequestInterceptor, RequestInterceptorLike, RequestHandler, RequestHandlerLike, RequestFilterLike } from '@tsdi/common';
import { ClientConfig } from './options';
import { AbstractClient } from './AbstractClient';

function toMicroName(microservice?: boolean, name?: string) {
    if (!name) return microservice ? 'MICRO' : '';
    return microservice ? 'MICRO_' + (name ?? '') : name
}

export function getClientGuardsToken(config: ClientConfig): Token<GuardLike[]> {
    if (!config.guardsToken) {
        config.guardsToken = getToken<GuardLike[]>(`${Transport[config.transport].toUpperCase()}_GUARDS`, toMicroName(config.microservice));
    }
    return config.guardsToken;
}

export function getClientFiltersToken(config: ClientConfig): Token<RequestFilterLike[]> {
    if (!config.filtersToken) {
        config.filtersToken = getToken<RequestFilterLike[]>(`${Transport[config.transport].toUpperCase()}_FILTERS`, toMicroName(config.microservice));
    }
    return config.filtersToken;
}

export function getClientInterceptorsToken(config: ClientConfig): Token<RequestInterceptorLike[]> {
    if (!config.interceptorsToken) {
        config.interceptorsToken = getToken<RequestInterceptor[]>(`${Transport[config.transport].toUpperCase()}_CLIENT_INTERCEPTORS`, toMicroName(config.microservice));
    }
    return config.interceptorsToken;
}



export function getClientTransfersToken(config: ClientConfig): Token<RequestInterceptorLike[]> {
    if (!config.transfersToken) {
        config.transfersToken = getToken<RequestInterceptorLike[]>(`${Transport[config.transport].toUpperCase()}_CLIENT_TRANSFERS`, toMicroName(config.microservice));
    }
    return config.transfersToken;
}



export function getClientOptionsToken(config: ClientConfig): Token<ClientConfig> {
    return getToken<ClientConfig>(`${Transport[config.transport].toUpperCase()}_CLIENT_OPTIONS`, toMicroName(config.microservice, config.name));
}

export function getClientHandlerToken(config: ClientConfig): Token<RequestHandler> {
    return getToken<RequestHandler>(`${Transport[config.transport].toUpperCase()}_CLIENT_HANDLER`, toMicroName(config.microservice, config.name));
}


export function getClientBackendToken(config: ClientConfig): Token<RequestHandlerLike> {
    if (!config.backendToken) {
        config.backendToken = getToken<RequestHandlerLike>(`${Transport[config.transport].toUpperCase()}_CLIENT_BACKEND`, toMicroName(config.microservice, config.name));
    }
    return config.backendToken;
}

export function getClientToken(config: ClientConfig): Token<AbstractClient> {
    return getToken<AbstractClient>(`${Transport[config.transport].toUpperCase()}_CLIENT`, toMicroName(config.microservice, config.name));
}
