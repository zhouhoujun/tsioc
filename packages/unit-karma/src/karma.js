"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarmaReporter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const unit_1 = require("@tsdi/unit");
const platform_browser_1 = require("@tsdi/platform-browser");
const core_1 = require("@tsdi/core");
const common_1 = require("@tsdi/common");
/**
 * KarmaReporter for browser test environment.
 * 浏览器环境测试报告器
 */
let KarmaReporter = class KarmaReporter extends unit_1.RealtimeReporter {
    constructor(hrtime, document) {
        super();
        this.hrtime = hrtime;
        this.document = document ?? null;
    }
    track(error) {
        console.error(error.stack || error.message);
        throw error;
    }
    renderSuite(desc) {
        console.log('\n  ', desc.describe, '\n');
    }
    renderCase(desc) {
        const status = desc.error ? 'x' : '√';
        const time = desc.used ? this.hrtime.format(desc.used, 3) : '0ms';
        console.log('    ', status, desc.title, `(${time})`);
        if (this.document) {
            this.renderToDom(desc);
        }
    }
    renderToDom(desc) {
        if (!this.document)
            return;
        const testResults = this.document.getElementById('test-results');
        if (!testResults)
            return;
        const testCase = this.document.createElement('div');
        testCase.className = desc.error ? 'test-case failed' : 'test-case passed';
        testCase.innerHTML = `
            <span class="status">${desc.error ? 'x' : '√'}</span>
            <span class="title">${desc.title}</span>
            <span class="time">(${desc.used ? this.hrtime.format(desc.used, 3) : '0ms'})</span>
        `;
        if (desc.error) {
            const errorDiv = this.document.createElement('div');
            errorDiv.className = 'error-details';
            errorDiv.innerHTML = `<pre>${desc.error.stack || desc.error.message}</pre>`;
            testCase.appendChild(errorDiv);
        }
        testResults.appendChild(testCase);
    }
    async render(suites, total) {
        const suitesArray = suites instanceof Map
            ? Array.from(suites.values())
            : suites;
        const fails = {};
        let successed = 0, failed = 0;
        suitesArray.forEach(d => {
            d.cases.forEach(c => {
                if (c.error) {
                    failed++;
                    const derr = fails[d.describe] = fails[d.describe] || [];
                    derr.push(`\n    ${c.title}\n`);
                    derr.push(c.error.stack || c.error.message);
                }
                else {
                    successed++;
                }
            });
        });
        let reportStr = '\n  ' + `${successed} passing`;
        if (failed > 0)
            reportStr += ` ${failed} failed`;
        if (suitesArray.length && total)
            reportStr += ` (${this.hrtime.format(total, 3)})`;
        reportStr += '\n';
        Object.keys(fails).forEach(describe => {
            reportStr += '\n\n  ' + describe;
            fails[describe].forEach(stack => reportStr += '\n' + stack);
        });
        console.log(reportStr);
        if (this.document) {
            this.renderSummaryToDom(successed, failed, total, fails);
        }
    }
    renderSummaryToDom(successed, failed, used, fails) {
        if (!this.document)
            return;
        const summaryDiv = this.document.getElementById('test-summary');
        if (!summaryDiv)
            return;
        summaryDiv.className = failed > 0 ? 'summary failed' : 'summary passed';
        summaryDiv.innerHTML = `
            <div class="stats">
                <span class="passed">${successed} passing</span>
                ${failed > 0 ? `<span class="failed">${failed} failed</span>` : ''}
                <span class="time">(${used ? this.hrtime.format(used, 3) : '0ms'})</span>
            </div>
        `;
        if (Object.keys(fails).length > 0) {
            const doc = this.document;
            const failuresDiv = doc.createElement('div');
            failuresDiv.className = 'failures';
            Object.keys(fails).forEach(describe => {
                const suiteDiv = doc.createElement('div');
                suiteDiv.className = 'suite-failures';
                suiteDiv.innerHTML = `<h3>${describe}</h3>`;
                fails[describe].forEach(stack => {
                    const errorPre = doc.createElement('pre');
                    errorPre.textContent = stack;
                    suiteDiv.appendChild(errorPre);
                });
                failuresDiv.appendChild(suiteDiv);
            });
            summaryDiv.appendChild(failuresDiv);
        }
    }
};
exports.KarmaReporter = KarmaReporter;
exports.KarmaReporter = KarmaReporter = tslib_1.__decorate([
    (0, ioc_1.Module)({
        imports: [
            platform_browser_1.BrowserModule
        ]
    }),
    tslib_1.__param(0, (0, ioc_1.Inject)()),
    tslib_1.__param(1, (0, ioc_1.Optional)()),
    tslib_1.__param(1, (0, ioc_1.Inject)(common_1.DOCUMENT)),
    tslib_1.__metadata("design:paramtypes", [core_1.HrtimeFormatter, Object])
], KarmaReporter);
//# sourceMappingURL=karma.js.map