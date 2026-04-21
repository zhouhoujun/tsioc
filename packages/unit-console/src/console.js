"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleReporter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const unit_1 = require("@tsdi/unit");
const chalk = require('chalk');
let ConsoleReporter = class ConsoleReporter extends unit_1.RealtimeReporter {
    track(error) {
        console.log(chalk.red(error.stack || error.message));
        throw error;
    }
    renderSuite(desc) {
        console.log('\n  ', desc.describe, '\n');
    }
    renderCase(desc) {
        console.log('    ', desc.error ? chalk.red('x') : chalk.green('√'), chalk.gray(desc.title), chalk.gray(` (${this.hrtime.format(desc.used, 3)})`));
    }
    async render(suites, total) {
        let reportStr = '';
        const fails = {};
        let successed = 0, failed = 0;
        suites.forEach(d => {
            d.cases.forEach(c => {
                if (c.error) {
                    failed++;
                    const derr = fails[d.describe] = fails[d.describe] || [];
                    derr.push(`\n    ${c.title}\n`);
                    derr.push(chalk.red(c.error.stack || c.error.message));
                }
                else {
                    successed++;
                }
            });
        });
        reportStr = reportStr + '\n  ';
        reportStr = reportStr + chalk.green(successed.toString() + ' passing');
        if (failed > 0) {
            reportStr = reportStr + ' ' + chalk.red(failed.toString() + ' failed');
        }
        if (suites.length) {
            reportStr = reportStr + chalk.gray(` (${this.hrtime.format(total, 3)})`);
        }
        reportStr += '\n';
        ioc_1.lang.forIn(fails, (errors, describe) => {
            reportStr = reportStr + '\n\n  ' + describe;
            errors.forEach(stack => {
                reportStr = reportStr + '\n' + stack;
            });
        });
        console.log(reportStr);
        if (Object.values(fails).length) {
            process.exit(1);
        }
    }
};
exports.ConsoleReporter = ConsoleReporter;
exports.ConsoleReporter = ConsoleReporter = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], ConsoleReporter);
//# sourceMappingURL=console.js.map