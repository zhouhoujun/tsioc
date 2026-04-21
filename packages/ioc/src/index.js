"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIModule = exports.AutoWired = exports.lang = exports.Container = void 0;
const tslib_1 = require("tslib");
tslib_1.__exportStar(require("./exception"), exports);
tslib_1.__exportStar(require("./types"), exports);
tslib_1.__exportStar(require("./tokens"), exports);
tslib_1.__exportStar(require("./destroy"), exports);
tslib_1.__exportStar(require("./injector"), exports);
var injector_1 = require("./injector");
Object.defineProperty(exports, "Container", { enumerable: true, get: function () { return injector_1.Injector; } });
tslib_1.__exportStar(require("./context"), exports);
tslib_1.__exportStar(require("./resolver"), exports);
tslib_1.__exportStar(require("./invocation"), exports);
tslib_1.__exportStar(require("./runtime"), exports);
// utils
tslib_1.__exportStar(require("./utils/chk"), exports);
tslib_1.__exportStar(require("./utils/obj"), exports);
tslib_1.__exportStar(require("./utils/token"), exports);
tslib_1.__exportStar(require("./utils/lang"), exports);
exports.lang = require("./utils/lang");
// metadata
tslib_1.__exportStar(require("./metadata/meta"), exports);
tslib_1.__exportStar(require("./metadata/type"), exports);
tslib_1.__exportStar(require("./metadata/define"), exports);
tslib_1.__exportStar(require("./metadata/class"), exports);
tslib_1.__exportStar(require("./metadata/type.def"), exports);
tslib_1.__exportStar(require("./metadata/fac"), exports);
tslib_1.__exportStar(require("./metadata/decor"), exports);
var decor_1 = require("./metadata/decor");
Object.defineProperty(exports, "AutoWired", { enumerable: true, get: function () { return decor_1.Autowired; } });
Object.defineProperty(exports, "DIModule", { enumerable: true, get: function () { return decor_1.Module; } });
// providers
tslib_1.__exportStar(require("./providers"), exports);
// handlers
tslib_1.__exportStar(require("./handlers/contexts"), exports);
tslib_1.__exportStar(require("./handlers/handler"), exports);
tslib_1.__exportStar(require("./handlers/interceptor"), exports);
tslib_1.__exportStar(require("./handlers/compose"), exports);
tslib_1.__exportStar(require("./handlers/intercepting"), exports);
tslib_1.__exportStar(require("./lifescope/context"), exports);
tslib_1.__exportStar(require("./lifescope/handler"), exports);
tslib_1.__exportStar(require("./impl/initialize"), exports);
tslib_1.__exportStar(require("./impl/design"), exports);
// module
tslib_1.__exportStar(require("./module.ref"), exports);
// ioc default implmenents.
tslib_1.__exportStar(require("./impl"), exports);
//# sourceMappingURL=index.js.map