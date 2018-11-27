import { Task, CtxType } from '@taskfr/core';
import { ObjectMap } from '@ts-ioc/core';
import { ShellActivity, ShellActivityConfig } from '../ShellActivity';

/**
 * closure command args.
 *
 * @export
 * @interface ClosureCmdArgs
 */
export interface ClosureCmdArgs {
    warningLevel?: string;
    flagfile: string;
    outFile: string;
    manifest: string;
}

export interface ClosureActivityConfig extends ShellActivityConfig {
    jarPath: CtxType<string>;
    args: CtxType<ClosureCmdArgs>;
}

/**
 * closure activity.
 *
 * @export
 * @class ClosureActivity
 * @extends {ShellActivity}
 */
@Task('closure')
export class ClosureActivity extends ShellActivity {

    jarPath: string;

    async onActivityInit(config: ClosureActivityConfig) {
        await super.onActivityInit(config);
        this.jarPath = this.getContext().to(config.jarPath);
        this.shell = this.shell || 'java -jar';
    }

    protected formatShell(shell: string): string {
        return super.formatShell(`${shell} ${this.jarPath}`);
    }

    protected formatArg(arg: any, key: string, args?: ObjectMap<any>): string {
        switch (key) {
            case 'warningLevel':
                return `--warning_level=${arg}`;
            case 'outFile':
                return `--js_output_file ${arg}`;
            case 'manifest':
                return `--output_manifest ${arg}`;

        }
        return super.formatArg(arg, key, args);
    }

}
