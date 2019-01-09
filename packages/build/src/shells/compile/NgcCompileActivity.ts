import * as path from 'path';
import { Task, CtxType } from '@ts-ioc/activities';
import { lang } from '@ts-ioc/core';
import { ShellActivity, ShellActivityConfig } from '../ShellActivity';

export interface AngularConfig {
    defaultProject?: string;
}

/**
 * ngc builder activity config.
 *
 * @export
 * @interface NgcCompileActivityConfig
 * @extends {ShellActivityConfig}
 */
export interface NgcCompileActivityConfig extends ShellActivityConfig {
    /**
     * tsconfig.
     *
     * @type {CtxType<string>}
     * @memberof NgcCompileActivityConfig
     */
    tsconfig?: CtxType<string>;
}

/**
 * ngc compile activity.
 *
 * @export
 * @class NgcCompileActivity
 * @extends {ShellActivity}
 */
@Task('ngc')
export class NgcCompileActivity extends ShellActivity {

    /**
     * tsconfig.
     *
     * @type {string}
     * @memberof NgcCompileActivity
     */
    tsconfig: string;

    /**
     * project root.
     *
     * @type {string}
     * @memberof NgcCompileActivity
     */
    projectRoot: string;

    async onActivityInit(config: NgcCompileActivityConfig) {
        await super.onActivityInit(config);
        this.options = lang.assign({silent: true}, this.options || {});
        this.tsconfig = this.context.to(config.tsconfig);
        this.shell = this.shell || path.join(this.context.getRootPath(), 'node_modules', '.bin', 'ngc');
    }

    protected formatShell(shell: string): string {
        shell = shell + ' -p ' + this.tsconfig;
        return super.formatShell(shell);
    }

    protected checkStderr(err, resolve: Function, reject: Function) {
        super.checkStderr(err, resolve, reject);
        if (err.includes('Compilation complete.')) {
            resolve();
        }
    }
}
