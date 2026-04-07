import { Token, Module, Inject } from '@tsdi/ioc';
import { SuiteDescribe, RealtimeReporter, ICaseDescribe } from '@tsdi/unit';
import { ServerModule } from '@tsdi/platform-server';
import { HrtimeFormatter } from '@tsdi/core';

/**
 * KarmaReporter for browser test environment.
 * 浏览器环境测试报告器
 */
@Module({
    imports: [
        ServerModule
    ]
})
export class KarmaReporter extends RealtimeReporter {

    constructor(@Inject() hrtime: HrtimeFormatter) {
        super();
        this.hrtime = hrtime;
    }

    override track(error: Error): void {
        console.error(error.stack || error.message);
        throw error;
    }

    override renderSuite(desc: SuiteDescribe): void {
        console.log('\n  ', desc.describe, '\n');
    }

    override renderCase(desc: ICaseDescribe): void {
        const status = desc.error ? '✗' : '✓';
        const time = desc.used ? this.hrtime.format(desc.used, 3) : '0ms';
        console.log('    ', status, desc.title, `(${time})`);
        
        if (typeof window !== 'undefined' && window.document) {
            this.renderToDom(desc);
        }
    }

    protected renderToDom(desc: ICaseDescribe): void {
        const testResults = window.document.getElementById('test-results');
        if (!testResults) return;

        const testCase = window.document.createElement('div');
        testCase.className = desc.error ? 'test-case failed' : 'test-case passed';
        testCase.innerHTML = `
            <span class="status">${desc.error ? '✗' : '✓'}</span>
            <span class="title">${desc.title}</span>
            <span class="time">(${desc.used ? this.hrtime.format(desc.used, 3) : '0ms'})</span>
        `;
        
        if (desc.error) {
            const errorDiv = window.document.createElement('div');
            errorDiv.className = 'error-details';
            errorDiv.innerHTML = `<pre>${desc.error.stack || desc.error.message}</pre>`;
            testCase.appendChild(errorDiv);
        }
        testResults.appendChild(testCase);
    }

    override async render(suites: Map<Token, SuiteDescribe>): Promise<void> {
        let first: SuiteDescribe | undefined;
        let used: [number, number] | undefined;
        const sus = Array.from(suites.values());
        const fails: Record<string, string[]> = {};
        let successed = 0, failed = 0;

        sus.forEach((d, i) => {
            if (i === 0) {
                first = d;
                used = this.hrtime.hrtime(first.start);
            }
            d.cases.forEach(c => {
                if (c.error) {
                    failed++;
                    const derr = fails[d.describe] = fails[d.describe] || [];
                    derr.push(`\n    ${c.title}\n`);
                    derr.push(c.error.stack || c.error.message);
                } else {
                    successed++;
                }
            });
        });

        let reportStr = '\n  ' + `${successed} passing`;
        if (failed > 0) reportStr += ` ${failed} failed`;
        if (sus.length) reportStr += ` (${this.hrtime.format(used, 3)})`;
        reportStr += '\n';

        Object.keys(fails).forEach(describe => {
            reportStr += '\n\n  ' + describe;
            fails[describe].forEach(stack => reportStr += '\n' + stack);
        });

        console.log(reportStr);

        if (typeof window !== 'undefined' && window.document) {
            this.renderSummaryToDom(successed, failed, used, fails);
        }
    }

    protected renderSummaryToDom(successed: number, failed: number, used: [number, number] | undefined, fails: Record<string, string[]>): void {
        const summaryDiv = window.document.getElementById('test-summary');
        if (!summaryDiv) return;

        summaryDiv.className = failed > 0 ? 'summary failed' : 'summary passed';
        summaryDiv.innerHTML = `
            <div class="stats">
                <span class="passed">${successed} passing</span>
                ${failed > 0 ? `<span class="failed">${failed} failed</span>` : ''}
                <span class="time">(${used ? this.hrtime.format(used, 3) : '0ms'})</span>
            </div>
        `;
        
        if (Object.keys(fails).length > 0) {
            const failuresDiv = window.document.createElement('div');
            failuresDiv.className = 'failures';
            Object.keys(fails).forEach(describe => {
                const suiteDiv = window.document.createElement('div');
                suiteDiv.className = 'suite-failures';
                suiteDiv.innerHTML = `<h3>${describe}</h3>`;
                fails[describe].forEach(stack => {
                    const errorPre = window.document.createElement('pre');
                    errorPre.textContent = stack;
                    suiteDiv.appendChild(errorPre);
                });
                failuresDiv.appendChild(suiteDiv);
            });
            summaryDiv.appendChild(failuresDiv);
        }
    }
}