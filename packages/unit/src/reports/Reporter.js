"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeReporter = exports.CoverageReporter = exports.AbstractReporter = exports.UNIT_REPORTES = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
/**
 * unit report multi token.
 */
exports.UNIT_REPORTES = (0, ioc_1.token)('UNIT_REPORTES');
/**
 * abstract reportor. base reportor.
 *
 * @export
 * @abstract
 * @class Reporter
 */
let AbstractReporter = class AbstractReporter {
};
exports.AbstractReporter = AbstractReporter;
tslib_1.__decorate([
    (0, ioc_1.Inject)(),
    tslib_1.__metadata("design:type", core_1.HrtimeFormatter)
], AbstractReporter.prototype, "hrtime", void 0);
exports.AbstractReporter = AbstractReporter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], AbstractReporter);
let CoverageReporter = class CoverageReporter extends AbstractReporter {
};
exports.CoverageReporter = CoverageReporter;
exports.CoverageReporter = CoverageReporter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], CoverageReporter);
/**
 * realtime reporter.
 */
let RealtimeReporter = class RealtimeReporter extends AbstractReporter {
};
exports.RealtimeReporter = RealtimeReporter;
exports.RealtimeReporter = RealtimeReporter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], RealtimeReporter);
//# sourceMappingURL=Reporter.js.map