"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESPONSE = void 0;
exports.getGuardsToken = getGuardsToken;
exports.getFiltersToken = getFiltersToken;
exports.getRequestVaildatorsToken = getRequestVaildatorsToken;
exports.getResponseVaildatorsToken = getResponseVaildatorsToken;
exports.getInterceptorsToken = getInterceptorsToken;
exports.getMiddlewaresToken = getMiddlewaresToken;
exports.getTransfersToken = getTransfersToken;
exports.getRouterToken = getRouterToken;
exports.getServiceOptionsToken = getServiceOptionsToken;
exports.getServiceHandlerToken = getServiceHandlerToken;
exports.getServiceBackendToken = getServiceBackendToken;
exports.getServiceToken = getServiceToken;
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const router_1 = require("./router/router");
exports.RESPONSE = (0, ioc_1.token)('RESPONSE');
function toMicroName(microservice, name) {
    if (!name)
        return microservice ? 'MICRO' : '';
    return microservice ? 'MICRO_' + (name ?? '') : name;
}
function getGuardsToken(config) {
    if (!config.guardsToken) {
        config.guardsToken = (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_GUARDS`, toMicroName(config.microservice));
    }
    return config.guardsToken;
}
function getFiltersToken(config) {
    if (!config.filtersToken) {
        config.filtersToken = (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_FILTERS`, toMicroName(config.microservice));
    }
    return config.filtersToken;
}
function getRequestVaildatorsToken(config) {
    if (!config.requestVaildatorsToken) {
        config.requestVaildatorsToken = (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_REQ_VAILDATORS`, toMicroName(config.microservice));
    }
    return config.requestVaildatorsToken;
}
function getResponseVaildatorsToken(config) {
    if (!config.responseVaildatorsToken) {
        config.responseVaildatorsToken = (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_RES_VAILDATORS`, toMicroName(config.microservice));
    }
    return config.responseVaildatorsToken;
}
// export function getVaildatorsToken(config: ServiceConfig): Token<Vaildator[]> {
//     if(!config.vaildatorsToken) {
//         config.vaildatorsToken = getToken<Vaildator[]>(`${Transport[config.transport].toUpperCase()}_VAILDATORS`, toMicroName(config.microservice));
//     }
//     return config.vaildatorsToken;
// }
function getInterceptorsToken(config) {
    if (!config.interceptorsToken) {
        config.interceptorsToken = (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_INTERCEPTORS`, toMicroName(config.microservice));
    }
    return config.interceptorsToken;
}
function getMiddlewaresToken(config) {
    if (!config.middlewaresToken) {
        config.middlewaresToken = (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_MIDDLEWARES`, toMicroName(config.microservice));
    }
    return config.middlewaresToken;
}
function getTransfersToken(config) {
    if (!config.transfersToken) {
        config.transfersToken = (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_TRANSFERS`, toMicroName(config.microservice));
    }
    return config.transfersToken;
}
function getRouterToken(config) {
    if (!config.routerToken) {
        config.routerToken = (0, ioc_1.getToken)(router_1.Router, common_1.Transport[config.transport] + '_' + toMicroName(config.microservice));
    }
    return config.routerToken;
}
function getServiceOptionsToken(config) {
    return (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_OPTIONS`, toMicroName(config.microservice, config.name));
}
function getServiceHandlerToken(config) {
    return (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_HANDLER`, toMicroName(config.microservice, config.name));
}
function getServiceBackendToken(config) {
    if (!config.backendToken) {
        config.backendToken = (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_BACKEND`, toMicroName(config.microservice, config.name));
    }
    return config.backendToken;
}
function getServiceToken(config) {
    return (0, ioc_1.getToken)(`${common_1.Transport[config.transport].toUpperCase()}_SERVICE`, toMicroName(config.microservice, config.name));
}
//# sourceMappingURL=tokens.js.map