import { Token, ObjectMap, lang } from '@tsdi/ioc';
import { DIModule } from '@tsdi/boot';
import { ISuiteDescribe, RealtimeReporter, ICaseDescribe } from '@tsdi/unit';
import { ServerModule } from '@tsdi/platform-server';
import { ServerLogsModule } from '@tsdi/platform-server-logs';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import * as chalk from 'chalk';

@DIModule({
    regIn: 'root',
    imports: [
        ServerModule,
        ServerBootstrapModule,
        ServerLogsModule
    ]
})
export class ConsoleReporter extends RealtimeReporter {

    track(error: Error): void {
        console.log(chalk.red(error.stack || error.message));
        throw error;
    }

    renderSuite(desc: ISuiteDescribe): void {
        console.log('\n  ', desc.describe, '\n');
    }

    renderCase(desc: ICaseDescribe): void {
        console.log('    ', desc.error ? chalk.red('x') : chalk.green('√'),  chalk.gray(desc.title));
    }

    async render(suites: Map<Token, ISuiteDescribe>): Promise<void> {
        let reportStr = '';
        let first: ISuiteDescribe, last: ISuiteDescribe;
        let sus = Array.from(suites.values());
        let fails: ObjectMap<string[]> = {};
        let successed = 0, failed = 0;
        sus.forEach((d, i) => {
            if (i === 0) {
                first = d;
            }
            if (i === (sus.length - 1)) {
                last = d;
            }
            // reportStr = reportStr + '\n  ' + d.describe + '\n';
            d.cases.forEach(c => {
                if (c.error) {
                    failed++;
                    let derr = fails[d.describe] = fails[d.describe] || [];
                    derr.push(`\n    ${c.title}\n`);
                    derr.push(chalk.red(c.error.stack));
                } else {
                    successed++;
                }
                // reportStr = reportStr + '    ' + (c.error ? chalk.red('x') : chalk.green('√')) + ' ' + chalk.gray(c.title) + '\n';
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

        reportStr += '\n';

        lang.forIn(fails, (errors, describe) => {
            reportStr = reportStr + '\n\n  ' + describe;
            errors.forEach(stack => {
                reportStr = reportStr + '\n' + stack;
            })
        })

        console.log(reportStr);
        if (Object.values(fails).length) {
            process.exit(1);
        }
    }
}
