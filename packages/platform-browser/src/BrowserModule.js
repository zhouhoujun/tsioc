"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserModule = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const common_1 = require("@tsdi/common");
const http_1 = require("@tsdi/common/http");
const xhr_1 = require("./xhr");
const hrtime_1 = require("./hrtime");
const processRoot = common_1.global.baseURL || '.';
class BrowserApplicationArguments extends core_1.ApplicationArguments {
    constructor() {
        super(...arguments);
        this._envOverride = {};
    }
    get argsSource() { return []; }
    get args() { return {}; }
    get cmds() { return []; }
    get env() { return {}; }
    get signls() { return []; }
    get name() { return this._envOverride.name ?? 'browser-app'; }
    get version() { return this._envOverride.version ?? '1.0.0'; }
    get mode() { return this._envOverride.mode ?? 'production'; }
    get platform() { return 'browser'; }
    get cwd() { return this._envOverride.cwd ?? processRoot; }
    get hostname() { return 'browser'; }
    get pid() { return 0; }
    get locale() { return navigator?.language || 'en-US'; }
    get timezone() { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
    get debug() { return this._envOverride.debug ?? false; }
    get logLevel() { return this._envOverride.logLevel ?? 'info'; }
    get baseURL() { return this._envOverride.baseURL ?? processRoot; }
    reset() { }
    mergeEnvironment(env) {
        this._envOverride = { ...this._envOverride, ...env };
    }
}
let BrowserModule = class BrowserModule {
};
exports.BrowserModule = BrowserModule;
exports.BrowserModule = BrowserModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providedIn: 'root',
        providers: [
            { provide: common_1.PLATFORM_ID, useValue: common_1.PLATFORM_BROWSER_ID },
            { provide: common_1.DOCUMENT, useFactory: () => document },
            { provide: http_1.XhrFactory, useClass: xhr_1.BrowserXhr },
            { provide: core_1.HrtimeFormatter, useClass: hrtime_1.BrowserHrtimeFormatter },
            { provide: core_1.ApplicationArguments, useClass: BrowserApplicationArguments }
        ]
    })
], BrowserModule);
//# sourceMappingURL=BrowserModule.js.map