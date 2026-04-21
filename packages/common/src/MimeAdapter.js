"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptsPriority = exports.MimeTypes = exports.MimeDb = exports.MimeAdapter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * mime type adapter.
 */
let MimeAdapter = class MimeAdapter {
    isJson(contentType) {
        return this.match(this.mimeTypes.json, contentType);
    }
    isXml(contentType) {
        return this.match(this.mimeTypes.xml, contentType);
    }
    isText(contentType) {
        return this.match(this.mimeTypes.text, contentType);
    }
    isForm(contentType) {
        return this.match(this.mimeTypes.form, contentType);
    }
};
exports.MimeAdapter = MimeAdapter;
exports.MimeAdapter = MimeAdapter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], MimeAdapter);
/**
 * mime db.
 */
let MimeDb = class MimeDb {
};
exports.MimeDb = MimeDb;
exports.MimeDb = MimeDb = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], MimeDb);
let MimeTypes = class MimeTypes {
};
exports.MimeTypes = MimeTypes;
exports.MimeTypes = MimeTypes = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], MimeTypes);
let AcceptsPriority = class AcceptsPriority {
};
exports.AcceptsPriority = AcceptsPriority;
exports.AcceptsPriority = AcceptsPriority = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], AcceptsPriority);
//# sourceMappingURL=MimeAdapter.js.map