"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnActivity = exports.WaitActivity = exports.EmitActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let EmitActivity = class EmitActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.bubble = true;
    }
    async execute(context) {
        try {
            const eventData = {
                type: this.event,
                data: this.data,
                timestamp: Date.now(),
                source: 'EmitActivity'
            };
            if (!context.events) {
                context.events = new Map();
            }
            if (!context.events.has(this.event)) {
                context.events.set(this.event, []);
            }
            context.events.get(this.event).push(eventData);
            return {
                success: true,
                data: {
                    emitted: true,
                    event: this.event,
                    eventData
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
};
exports.EmitActivity = EmitActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], EmitActivity.prototype, "event", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], EmitActivity.prototype, "data", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], EmitActivity.prototype, "bubble", void 0);
exports.EmitActivity = EmitActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'emit' })
], EmitActivity);
let WaitActivity = class WaitActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.eventListeners = new Map();
    }
    async execute(context) {
        return new Promise((resolve) => {
            let timeoutId = null;
            let resolved = false;
            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                this.eventListeners.delete(this.event);
            };
            const resolveOnce = (result) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(result);
                }
            };
            if (this.timeout) {
                timeoutId = setTimeout(() => {
                    resolveOnce({
                        success: false,
                        error: new Error(`Timeout waiting for event: ${this.event}`),
                        data: { event: this.event, timedOut: true }
                    });
                }, this.timeout);
            }
            const checkEvent = async () => {
                if (context.events?.has(this.event)) {
                    const events = context.events.get(this.event);
                    if (events.length > 0) {
                        const eventData = events.shift();
                        if (this.handler) {
                            try {
                                const handlerResult = await this.handler(eventData.data, context);
                                resolveOnce({
                                    success: true,
                                    data: { event: this.event, eventData, handlerResult }
                                });
                            }
                            catch (error) {
                                resolveOnce({
                                    success: false,
                                    error: error,
                                    data: { event: this.event, eventData }
                                });
                            }
                        }
                        else {
                            resolveOnce({
                                success: true,
                                data: { event: this.event, eventData }
                            });
                        }
                    }
                }
            };
            this.eventListeners.set(this.event, async () => {
                await checkEvent();
            });
            checkEvent();
        });
    }
    async compensate(context) {
        this.eventListeners.clear();
    }
};
exports.WaitActivity = WaitActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], WaitActivity.prototype, "event", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], WaitActivity.prototype, "timeout", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], WaitActivity.prototype, "handler", void 0);
exports.WaitActivity = WaitActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'wait' })
], WaitActivity);
let OnActivity = class OnActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.once = false;
    }
    async execute(context) {
        if (!context.events) {
            context.events = new Map();
        }
        const wrappedHandler = async (data) => {
            return await this.handler(data, context);
        };
        context.events.set(this.event, context.events.get(this.event) || []);
        return {
            success: true,
            data: {
                registered: true,
                event: this.event,
                once: this.once
            }
        };
    }
};
exports.OnActivity = OnActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], OnActivity.prototype, "event", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], OnActivity.prototype, "handler", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], OnActivity.prototype, "once", void 0);
exports.OnActivity = OnActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'on' })
], OnActivity);
//# sourceMappingURL=Event.js.map