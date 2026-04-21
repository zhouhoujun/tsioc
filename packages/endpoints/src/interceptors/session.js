"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionInterceptor = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const rxjs_1 = require("rxjs");
const Session_1 = require("../sessions/Session");
/**
 * session.
 */
let SessionInterceptor = class SessionInterceptor {
    constructor(options) {
        this.options = options ?? defOpts;
    }
    intercept(input, next, context) {
        const session = context.get(Session_1.Session);
        if (!session) {
            return next.handle(input, context);
        }
        // 添加错误处理和状态检查
        return (0, rxjs_1.from)(session.load())
            .pipe((0, rxjs_1.mergeMap)(() => {
            if (!session.isValid()) {
                return (0, rxjs_1.throwError)(() => new Error('Invalid session'));
            }
            return next.handle(input, context);
        }), (0, rxjs_1.catchError)(error => {
            console.error('Session error:', error);
            return (0, rxjs_1.throwError)(() => error);
        }), (0, rxjs_1.finalize)(() => {
            if (this.options?.autoCommit && session.isModified()) {
                session.commit().catch(err => {
                    console.error('Failed to commit session:', err);
                });
            }
        }));
    }
};
exports.SessionInterceptor = SessionInterceptor;
exports.SessionInterceptor = SessionInterceptor = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(0, (0, ioc_1.Optional)()),
    tslib_1.__param(0, (0, ioc_1.Inject)(Session_1.SESSION_OPTIONS)),
    tslib_1.__metadata("design:paramtypes", [Object])
], SessionInterceptor);
const defOpts = {
    key: 'endpoints',
    overwrite: true,
    httpOnly: true,
    signed: true,
    autoCommit: true,
    encode,
    decode
};
/**
 * Decode the base64 cookie value to an object.
 *
 * @param {String} string
 * @return {Object}
 * @api private
 */
function decode(str) {
    const body = Buffer.from(str, 'base64').toString('utf8');
    const json = JSON.parse(body);
    return json;
}
/**
 * Encode an object into a base64-encoded JSON string.
 *
 * @param {Object} body
 * @return {String}
 * @api private
 */
function encode(body) {
    body = JSON.stringify(body);
    return Buffer.from(body).toString('base64');
}
//# sourceMappingURL=session.js.map