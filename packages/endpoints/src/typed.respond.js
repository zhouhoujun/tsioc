"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointTypedRespond = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
let EndpointTypedRespond = class EndpointTypedRespond extends core_1.TypedRespond {
    respond(incoming, value, response, context) {
        if (response === 'body') {
            context.body = value;
        }
        else if (response === 'header') {
            context.setHeader(value);
        }
        else if (response === 'response') {
            const { headers, body, payload, statusCode, status, statusMessage, statusText } = (value ?? {});
            if (headers) {
                context.setHeader(headers);
            }
            if (body ?? payload) {
                context.body = body ?? payload;
            }
            if (status ?? statusCode) {
                context.status = status ?? statusCode;
            }
            if (statusMessage ?? statusText) {
                context.statusMessage = statusMessage ?? statusText;
            }
        }
    }
};
exports.EndpointTypedRespond = EndpointTypedRespond;
exports.EndpointTypedRespond = EndpointTypedRespond = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], EndpointTypedRespond);
//# sourceMappingURL=typed.respond.js.map