import * as path from 'path';
import { ShellActivityConfig } from '@taskfr/node';
import { Task, CtxType } from '@taskfr/core';
import { lang } from '@ts-ioc/core';
import { ShellCompilerActivity } from '../ShellCompilerActivity';

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
 * @extends {ShellCompilerActivity}
 */
@Task('ngc')
export class NgcCompileActivity extends ShellCompilerActivity {

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
        this.tsconfig = this.getContext().to(config.tsconfig);
        this.shell = this.shell || path.join(this.getContext().getRootPath(), 'node_modules', '.bin', 'ngc');
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
