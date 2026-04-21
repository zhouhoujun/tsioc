"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStatusAdapter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
let HttpStatusAdapter = class HttpStatusAdapter {
    get ok() {
        return 200 /* HttpStatusCode.Ok */;
    }
    get found() {
        return 302 /* HttpStatusCode.Found */;
    }
    get notFound() {
        return 404 /* HttpStatusCode.NotFound */;
    }
    get serverError() {
        return 500 /* HttpStatusCode.InternalServerError */;
    }
    get none() {
        return 0;
    }
    get noContent() {
        return 204 /* HttpStatusCode.NoContent */;
    }
    get gatewayTimeout() {
        return 504 /* HttpStatusCode.GatewayTimeout */;
    }
    isStatus(status) {
        return !!common_1.statusMessage[status];
    }
    isOk(status) {
        return status == 200 /* HttpStatusCode.Ok */;
    }
    isNotFound(status) {
        return status == 404 /* HttpStatusCode.NotFound */;
    }
    isEmpty(status) {
        return emptyStatus[status];
    }
    isEmptyException(status) {
        return false;
    }
    isRedirect(status) {
        return redirectStatus[status];
    }
    isRequestFailed(status) {
        return status >= 400 && status < 500;
    }
    isServerError(status) {
        return status >= 500;
    }
    isRetry(status) {
        return retryStatus[status];
    }
    redirectBodify(status, method) {
        if (!method)
            return status === 303;
        return status === 303 || ((status === 301 || status === 302) && method === common_1.POST);
    }
    redirectDefaultMethod() {
        return common_1.GET;
    }
};
exports.HttpStatusAdapter = HttpStatusAdapter;
exports.HttpStatusAdapter = HttpStatusAdapter = tslib_1.__decorate([
    (0, ioc_1.Injectable)({ static: true })
], HttpStatusAdapter);
/**
 * status codes for redirects
 */
const redirectStatus = {
    300: true,
    301: true,
    302: true,
    303: true,
    305: true,
    307: true,
    308: true
};
/**
 * status codes for empty bodies
 */
const emptyStatus = {
    204: true,
    205: true,
    304: true
};
/**
 * status codes for when you should retry the request
 */
const retryStatus = {
    502: true,
    503: true,
    504: true
};
//# sourceMappingURL=status.js.map