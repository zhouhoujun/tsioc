import { Reporter, ISuiteDescribe, Report, ICaseDescribe } from '@ts-ioc/unit';
import { Token } from '@ts-ioc/core';
import chalk from 'chalk';

@Report
export class ConsoleReporter extends Reporter {

    async render(suites: Map<Token<any>, ISuiteDescribe>): Promise<void> {
        let reportStr = '';
        let first: ISuiteDescribe, last: ISuiteDescribe;
        let sus = Array.from(suites.values());
        let fails: ICaseDescribe[] = [];
        let successed = 0, failed = 0;
        sus.forEach((d, i) => {
            if (i === 0) {
                first = d;
            }
            if (i === (sus.length - 1)) {
                last = d;
            }
            reportStr = reportStr + '\n  ' + d.describe + '\n';
            d.cases.forEach(c => {
                if (c.error) {
                    failed++;
                    fails.push(c);
                } else {
                    successed++;
                }
                reportStr = reportStr + '    ' + (c.error ? chalk.red('x') : chalk.green('√')) + ' ' + chalk.gray(c.title) + '\n';
            });
        });

        reportStr = reportStr + '\n  ';
        reportStr = reportStr + chalk.green(successed.toString() + ' passing');
        if (failed > 0) {
            reportStr = reportStr + ' ' + chalk.red(failed.toString() + ' failed');
        }
        if (sus.length) {
            reportStr = reportStr + chalk.gray(` (${last.end - first.start}ms)`);
        }

        if (fails.length) {
            reportStr = reportStr + '\n\n  ';
            fails.forEach(f => {
                reportStr = reportStr + chalk.red(f.error.stack);
            })
        }
        console.log(reportStr);
        if (fails.length) {
            process.exit(1);
        }
    }
}
