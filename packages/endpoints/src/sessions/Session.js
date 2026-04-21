"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = exports.Session = exports.SESSION_OPTIONS = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
exports.SESSION_OPTIONS = (0, ioc_1.token)('SESSION_OPTIONS');
/**
 * session storage.
 */
let Session = class Session {
};
exports.Session = Session;
exports.Session = Session = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], Session);
let SessionManager = class SessionManager {
};
exports.SessionManager = SessionManager;
exports.SessionManager = SessionManager = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], SessionManager);
//# sourceMappingURL=Session.js.map