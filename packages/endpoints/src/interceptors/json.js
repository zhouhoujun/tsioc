"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonInterceptor = exports.JsonOptions = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const rxjs_1 = require("rxjs");
let JsonOptions = class JsonOptions {
};
exports.JsonOptions = JsonOptions;
exports.JsonOptions = JsonOptions = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], JsonOptions);
let JsonInterceptor = class JsonInterceptor {
    constructor(option) {
        this.pretty = option?.pretty ?? true;
        this.spaces = option?.spaces ?? 2;
        this.paramName = option?.param ?? '';
    }
    intercept(input, next, context) {
        return next.handle(input, context)
            .pipe((0, rxjs_1.map)(res => {
            return this.streamify(input, res, context);
        }));
    }
    streamify(input, res, context) {
        const streamAdapter = context.get(common_1.StreamAdapter);
        const strm = streamAdapter.isStream(res);
        const json = streamAdapter.isJson(res);
        if (!json && !strm) {
            return;
        }
        const pretty = this.pretty || (0, ioc_1.hasOwn)(input.query, this.paramName);
        if (strm && context.accepts('json')) {
            context.setContentType(common_1.ContentType.APPL_JSON);
            // ctx.contentType = ContentType.APPL_JSON;
            // ctx.body = ctx.streamAdapter.jsonSreamify(body, undefined, pretty ? this.spaces : 2) 
            // new JsonStreamStringify(body, undefined, pretty ? this.spaces : 2);
            return streamAdapter.jsonSreamify(res, undefined, pretty ? this.spaces : 2);
        }
        else if (json && pretty) {
            // ctx.contentType = ContentType.APPL_JSON_UTF8;
            // ctx.body = JSON.stringify(body, null, this.spaces);
            context.setContentType(common_1.ContentType.APPL_JSON_UTF8);
            return JSON.stringify(res, null, this.spaces);
        }
    }
};
exports.JsonInterceptor = JsonInterceptor;
exports.JsonInterceptor = JsonInterceptor = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(0, (0, ioc_1.Nullable)()),
    tslib_1.__metadata("design:paramtypes", [JsonOptions])
], JsonInterceptor);
//# sourceMappingURL=json.js.map