import { getToken, Token } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import { Transport, RequestInterceptor, RequestInterceptorLike, RequestHandler, RequestHandlerLike, RequestFilterLike } from '@tsdi/common';
import { ClientConfig } from './options';
import { AbstractClient } from './AbstractClient';

function toMicroName(microservice?: boolean, name?: string) {
    if (!name) return microservice ? 'MICRO' : '';
    return microservice ? 'MICRO_' + (name ?? '') : name;
}

export function getClientGuardsToken(config: ClientConfig): Token<GuardLike[]> {
    if (!config.features.guardsToken) {
        config.features.guardsToken = getToken<GuardLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_CLIENT_GUARDS`, toMicroName(config.microservice));
    }
    return config.features.guardsToken;
}

export function getClientFiltersToken(config: ClientConfig): Token<RequestFilterLike[]> {
    if (!config.features.filtersToken) {
        config.features.filtersToken = getToken<RequestFilterLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_CLIENT_FILTERS`, toMicroName(config.microservice));
    }
    return config.features.filtersToken;
}

export function getClientTransferFiltersToken(config: ClientConfig): Token<RequestFilterLike[]> {
    if (!config.features.transferFiltersToken) {
        config.features.transferFiltersToken = getToken<RequestFilterLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_CLIENT_TRANSFER_FILTERS`, toMicroName(config.microservice));
    }
    return config.features.transferFiltersToken;
}

export function getClientInterceptorsToken(config: ClientConfig): Token<RequestInterceptorLike[]> {
    if (!config.features.interceptorsToken) {
        config.features.interceptorsToken = getToken<RequestInterceptor[]>(`${Transport[config.transport].toUpperCase()}_MICRO_CLIENT_INTERCEPTORS`, toMicroName(config.microservice));
    }
    return config.features.interceptorsToken;
}

export function getClientOptionsToken(config: ClientConfig): Token<ClientConfig> {
    return getToken<ClientConfig>(`${Transport[config.transport].toUpperCase()}_MICRO_CLIENT_OPTIONS`, toMicroName(config.microservice, config.name));
}

export function getClientHandlerToken(config: ClientConfig): Token<RequestHandler> {
    return getToken<RequestHandler>(`${Transport[config.transport].toUpperCase()}_MICRO_CLIENT_HANDLER`, toMicroName(config.microservice, config.name));
}

export function getClientBackendToken(config: ClientConfig): Token<RequestHandlerLike> {
    if (!config.features.backendToken) {
        config.features.backendToken = getToken<RequestHandlerLike>(`${Transport[config.transport].toUpperCase()}_MICRO_CLIENT_BACKEND`, toMicroName(config.microservice, config.name));
    }
    return config.features.backendToken;
}

export function getClientToken(config: ClientConfig): Token<AbstractClient<any, any>> {
    return getToken<AbstractClient<any, any>>(`${Transport[config.transport].toUpperCase()}_MICRO_CLIENT`, toMicroName(config.microservice, config.name));
}
