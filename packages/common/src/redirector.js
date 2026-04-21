"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectInterceptor = exports.REDIRECT_STATE = exports.RedirectState = exports.Redirector = void 0;
const ioc_1 = require("@tsdi/ioc");
const rxjs_1 = require("rxjs");
class Redirector {
}
exports.Redirector = Redirector;
class RedirectState {
    constructor(init = {}) {
        this.follow = init.follow ?? 20;
        this.counter = init.counter ?? 0;
        this.redirect = init.redirect ?? 'follow';
    }
}
exports.RedirectState = RedirectState;
exports.REDIRECT_STATE = new ioc_1.ContextToken(() => new RedirectState());
const redirectInterceptor = (req, next, context) => {
    return next(req, context)
        .pipe((0, rxjs_1.mergeMap)(r => {
        const redirector = context.get(Redirector);
        if (redirector && redirector.need(r, context)) {
            return redirector.redirect(req, r, next, context);
        }
        return (0, rxjs_1.of)(r);
    }));
};
exports.redirectInterceptor = redirectInterceptor;
//# sourceMappingURL=redirector.js.map