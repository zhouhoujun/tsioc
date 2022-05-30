import { Token, lang } from '@tsdi/ioc';
import { Module, TimesPipe } from '@tsdi/core';
import { SuiteDescribe, RealtimeReporter, ICaseDescribe } from '@tsdi/unit';
import { ServerModule, ServerLogsModule } from '@tsdi/platform-server';
import * as chalk from 'chalk';

@Module({
    providedIn: 'root',
    imports: [
        ServerModule,
        ServerLogsModule
    ]
})
export class ConsoleReporter extends RealtimeReporter {

    constructor(private timesPipe: TimesPipe) {
        super();
    }

    override track(error: Error): void {
        console.log(chalk.red(error.stack || error.message));
        throw error
    }

    override renderSuite(desc: SuiteDescribe): void {
        console.log('\n  ', desc.describe, '\n')
    }

    override renderCase(desc: ICaseDescribe): void {
        console.log('    ', desc.error ? chalk.red('x') : chalk.green('√'), chalk.gray(desc.title))
    }

    override async render(suites: Map<Token, SuiteDescribe>): Promise<void> {
        let reportStr = '';
        let first: SuiteDescribe | undefined;
        let last: SuiteDescribe | undefined;
        const sus = Array.from(suites.values());
        const fails: Record<string, string[]> = {};
        let successed = 0, failed = 0;
        sus.forEach((d, i) => {
            if (i === 0) {
                first = d
            }
            if (i === (sus.length - 1)) {
                last = d
            }
            // reportStr = reportStr + '\n  ' + d.describe + '\n';
            d.cases.forEach(c => {
                if (c.error) {
                    failed++;
                    const derr = fails[d.describe] = fails[d.describe] || [];
                    derr.push(`\n    ${c.title}\n`);
                    derr.push(chalk.red(c.error.stack))
                } else {
                    successed++;
                }
                // reportStr = reportStr + '    ' + (c.error ? chalk.red('x') : chalk.green('√')) + ' ' + chalk.gray(c.title) + '\n';
            })
        });

        reportStr = reportStr + '\n  ';
        reportStr = reportStr + chalk.green(successed.toString() + ' passing');
        if (failed > 0) {
            reportStr = reportStr + ' ' + chalk.red(failed.toString() + ' failed')
        }
        if (sus.length) {
            reportStr = reportStr + chalk.gray(` (${this.timesPipe.transform((last?.end ?? 0) - (first?.start ?? 0), 3)})`)
        }

        reportStr += '\n';

        lang.forIn(fails, (errors, describe) => {
            reportStr = reportStr + '\n\n  ' + describe;
            errors.forEach(stack => {
                reportStr = reportStr + '\n' + stack
            })
        })

        console.log(reportStr);
        if (Object.values(fails).length) {
            process.exit(1)
        }
    }
}
