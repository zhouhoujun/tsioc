"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MimeModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@tsdi/common");
const ioc_1 = require("@tsdi/ioc");
const mime_1 = require("./impl/mime");
const mimedb_1 = require("./impl/mimedb");
const accepts_1 = require("./impl/accepts");
let MimeModule = class MimeModule {
};
exports.MimeModule = MimeModule;
exports.MimeModule = MimeModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            { provide: common_1.MimeTypes, useClass: mime_1.MimeTypesImpl },
            { provide: common_1.MimeDb, useClass: mimedb_1.BasicMimeDb },
            { provide: common_1.MimeAdapter, useClass: mime_1.MimeAdapterImpl },
            { provide: common_1.AcceptsPriority, useClass: accepts_1.AcceptsPriorityImpl }
        ]
    })
], MimeModule);
//# sourceMappingURL=mime.module.js.map