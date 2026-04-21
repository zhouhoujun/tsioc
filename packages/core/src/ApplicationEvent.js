"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationEvent = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Class to be extended by all application events. Abstract as it
 * doesn't make sense for generic events to be published directly.
 *
 * 应用程序事件抽象类， 直接发布通用事件没有意义。
 */
let ApplicationEvent = class ApplicationEvent {
    get propagation() {
        return this._propagation;
    }
    constructor(_source) {
        this._source = _source;
        this._propagation = true;
        this._timestamp = Date.now() / 1000;
    }
    stopPropagation() {
        this._propagation = false;
    }
    /**
     * event source target.
     */
    getSource() {
        return this._source;
    }
    /**
     * get the time in milliseconds when the event occurred.
     */
    getTimestamp() {
        return this._timestamp;
    }
    /**
     * run handles strategy, `FIFO` or `FILO`.
     * @returns
     */
    static getStrategy() {
        return 'FIFO';
    }
};
exports.ApplicationEvent = ApplicationEvent;
exports.ApplicationEvent = ApplicationEvent = tslib_1.__decorate([
    (0, ioc_1.Abstract)(),
    tslib_1.__metadata("design:paramtypes", [Object])
], ApplicationEvent);
//# sourceMappingURL=ApplicationEvent.js.map