"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinallizeFilter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const rxjs_1 = require("rxjs");
let FinallizeFilter = class FinallizeFilter extends common_1.RequestExceptionFilter {
    catchError(input, err, context) {
        const res = context.getResponse();
        res.statusCode = err.status ?? err.statusCode;
        res.statusMessage = err.statusMessage;
        res.error = err;
        context.setContentType(common_1.ContentType.APPL_JSON);
        context.setContentLength(0);
        return (0, rxjs_1.of)(res);
    }
};
exports.FinallizeFilter = FinallizeFilter;
exports.FinallizeFilter = FinallizeFilter = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], FinallizeFilter);
//# sourceMappingURL=finallize.fitler.js.map