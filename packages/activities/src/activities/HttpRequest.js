"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpRequestActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let HttpRequestActivity = class HttpRequestActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.method = 'GET';
        this.timeout = 30000;
        this.responseType = 'json';
    }
    async execute(context) {
        if (!this.url) {
            return {
                success: false,
                error: new Error('URL is required')
            };
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            const response = await fetch(this.url, {
                method: this.method,
                headers: this.headers,
                body: this.body ? JSON.stringify(this.body) : undefined,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            let data;
            if (this.responseType === 'text') {
                data = await response.text();
            }
            else if (this.responseType === 'blob') {
                data = await response.blob();
            }
            else if (this.responseType === 'arraybuffer') {
                data = await response.arrayBuffer();
            }
            else {
                data = await response.json();
            }
            return {
                success: response.ok,
                data: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    body: data
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
exports.HttpRequestActivity = HttpRequestActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], HttpRequestActivity.prototype, "url", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], HttpRequestActivity.prototype, "method", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], HttpRequestActivity.prototype, "headers", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], HttpRequestActivity.prototype, "body", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], HttpRequestActivity.prototype, "timeout", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], HttpRequestActivity.prototype, "responseType", void 0);
exports.HttpRequestActivity = HttpRequestActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'http-request' })
], HttpRequestActivity);
//# sourceMappingURL=HttpRequest.js.map