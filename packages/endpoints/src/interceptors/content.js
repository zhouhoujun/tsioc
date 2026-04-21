"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defOpts = exports.ContentInterceptor = exports.CONTENT_OPTIONS = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const rxjs_1 = require("rxjs");
exports.CONTENT_OPTIONS = (0, ioc_1.token)('CONTENT_OPTIONS');
/**
 * static content resources.
 */
let ContentInterceptor = class ContentInterceptor {
    constructor(options) {
        this.options = { ...exports.defOpts, ...options };
    }
    intercept(input, next, context) {
        const path = input.url || input.topic || input.pattern;
        if (!path || !(!input.method || input.method === common_1.HEAD || input.method === common_1.GET || input.method === '*')) {
            return next.handle(input, context);
        }
        const options = this.options;
        const fileAdapter = context.get(common_1.FileAdapter);
        const statusAdapter = context.get(common_1.StatusAdapter);
        if (options.defer) {
            return next.handle(input, context)
                .pipe((0, rxjs_1.mergeMap)(async (res) => {
                const file = await this.find(path, res, statusAdapter, fileAdapter, options);
                if (!file) {
                    return (0, rxjs_1.throwError)(() => new common_1.NotFoundException());
                }
                return file;
            }));
        }
        else {
            return (0, rxjs_1.from)(this.find(path, context.getResponse(), statusAdapter, fileAdapter, options))
                .pipe((0, rxjs_1.mergeMap)(file => {
                if (!file || !file.filename)
                    return next.handle(input, context);
                return this.send(context, file);
            }));
        }
    }
    async send(context, file) {
        const res = context.getResponse();
        if (this.options.setHeaders) {
            this.options.setHeaders(res, file.filename, file.stats);
        }
        const headerAdapter = context.get(common_1.HeaderAdapter);
        const fileAdapter = context.get(common_1.FileAdapter);
        headerAdapter.setContentLength(res, file.stats.size);
        if (!headerAdapter.getLastModified(res)) {
            headerAdapter.setLastModified(res, file.stats.mtime.toUTCString());
        }
        if (!headerAdapter.getCacheControl(res)) {
            const maxAge = this.options.maxAge ?? 0;
            const directives = [`max-age=${(maxAge / 1000 | 0)}`];
            if (this.options.immutable) {
                directives.push('immutable');
            }
            headerAdapter.setCacheControl(res, directives.join(','));
        }
        if (!headerAdapter.hasContentType(res)) {
            headerAdapter.setContentType(res, fileAdapter.extname(file.filename, file.encodingExt));
        }
        res.body = fileAdapter.read(file.filename);
        return res;
    }
    find(path, res, statusAdapter, fileAdapter, options) {
        if (statusAdapter && ((0, ioc_1.isDefined)(res.statusCode) && !statusAdapter.isNotFound(res.statusCode)))
            return Promise.resolve(null);
        return fileAdapter.find(path, options);
    }
};
exports.ContentInterceptor = ContentInterceptor;
exports.ContentInterceptor = ContentInterceptor = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(0, (0, ioc_1.Optional)()),
    tslib_1.__param(0, (0, ioc_1.Inject)(exports.CONTENT_OPTIONS)),
    tslib_1.__metadata("design:paramtypes", [Object])
], ContentInterceptor);
// /**
//  * Content send adapter.
//  */
// @Abstract()
// export abstract class ContentSendAdapter {
//     /**
//      * send file by request context
//      * @param ctx RequestContext
//      * @param path file path
//      * @param options send options
//      */
//     abstract send(ctx: AbstractRequestContext, path: string, options: SendOptions): Promise<string>;
// }
exports.defOpts = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    format: true,
    defer: false,
    immutable: false,
};
//# sourceMappingURL=content.js.map