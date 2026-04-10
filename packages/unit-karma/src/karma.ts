import { Token, Module, Inject, Optional } from '@tsdi/ioc';
import { SuiteDescribe, RealtimeReporter, ICaseDescribe } from '@tsdi/unit';
import { BrowserModule } from '@tsdi/platform-browser';
import { HrtimeFormatter } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';

type SuitesInput = SuiteDescribe[] | Map<Token, SuiteDescribe>;

interface LikeDocument {
    getElementById(id: string): LikeElement | null;
    createElement(tag: string): LikeElement;
}

interface LikeElement {
    className: string;
    innerHTML: string;
    textContent: string;
    appendChild(child: LikeElement): LikeElement;
}

/**
 * KarmaReporter for browser test environment.
 * 浏览器环境测试报告器
 */
@Module({
    imports: [
        BrowserModule
    ]
})
export class KarmaReporter extends RealtimeReporter {

    private document: LikeDocument | null;

    constructor(@Inject() hrtime: HrtimeFormatter, @Optional() @Inject(DOCUMENT) document?: Object) {
        super();
        this.hrtime = hrtime;
        this.document = document as LikeDocument ?? null;
    }

    override track(error: Error): void {
        console.error(error.stack || error.message);
        throw error;
    }

    override renderSuite(desc: SuiteDescribe): void {
        console.log('\n  ', desc.describe, '\n');
    }

    override renderCase(desc: ICaseDescribe): void {
        const status = desc.error ? 'x' : '√';
        const time = desc.used ? this.hrtime.format(desc.used, 3) : '0ms';
        console.log('    ', status, desc.title, `(${time})`);
        
        if (this.document) {
            this.renderToDom(desc);
        }
    }

    protected renderToDom(desc: ICaseDescribe): void {
        if (!this.document) return;
        
        const testResults = this.document.getElementById('test-results');
        if (!testResults) return;

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

    override async render(suites: SuitesInput, total?: [number, number]): Promise<void> {
        const suitesArray: SuiteDescribe[] = suites instanceof Map 
            ? Array.from(suites.values()) 
            : suites;

        const fails: Record<string, string[]> = {};
        let successed = 0, failed = 0;

        suitesArray.forEach(d=> {         
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
        if (suitesArray.length && total) reportStr += ` (${this.hrtime.format(total, 3)})`;
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

    protected renderSummaryToDom(successed: number, failed: number, used: [number, number] | undefined, fails: Record<string, string[]>): void {
        if (!this.document) return;
        
        const summaryDiv = this.document.getElementById('test-summary');
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
}