import * as path from 'path';
import { Task, Src, CtxType } from '@taskfr/core';
import { lang, ObjectMap } from '@ts-ioc/core';
import { RollupDirOptions, RollupFileOptions, rollup } from 'rollup';
import { ShellActivity, ShellActivityConfig } from '../ShellActivity';

export interface RollupCmdOptions {
    format: string,
    file: string,
    dir: string
}

/**
 * rollup activity config.
 *
 * @export
 * @interface RollupActivityConfig
 * @extends {ShellActivityConfig}
 */
export interface RollupActivityConfig extends ShellActivityConfig {

    /**
     * rollup cmd src.
     *
     * @type {CtxType<Src>}
     * @memberof RollupActivityConfig
     */
    src: CtxType<Src>;

    /**
     * rollup cmd args options.
     *
     * @type {CtxType<RollupCmdOptions>}
     * @memberof RollupActivityConfig
     */
    args: CtxType<RollupCmdOptions>;

    /**
     * rollup config file.
     *
     * @type {CtxType<string>}
     * @memberof RollupActivityConfig
     */
    rollupConfig?: CtxType<string>;

    /**
     * rollup dir options.
     *
     * @type {CtxType<RollupDirOptions>}
     * @memberof RollupActivityConfig
     */
    rollupDirOptions?: CtxType<RollupDirOptions>;

    /**
     * rollup file options.
     *
     * @type {CtxType<RollupFileOptions>}
     * @memberof RollupActivityConfig
     */
    rollupFileOptions?: CtxType<RollupFileOptions>;
}


/**
 * rollup activity.
 *
 * @export
 * @class RollupActivity
 * @extends {ShellActivity}
 */
@Task('rollup')
export class RollupActivity extends ShellActivity {
    /**
     * rollup src for cmd
     *
     * @type {string[]}
     * @memberof RollupActivity
     */
    src: string[];
    /**
     * rollup config file.
     *
     * @type {string}
     * @memberof RollupActivity
     */
    rollupConfig: string;
    rollupDirOptions: RollupDirOptions;
    rollupFileOptions: RollupFileOptions;

    async onActivityInit(config: RollupActivityConfig) {
        await super.onActivityInit(config);
        this.src = await this.context.getFiles(this.context.to(config.src));
        this.options = lang.assign({ silent: true }, this.options || {});
        this.rollupFileOptions = this.context.to(config.rollupFileOptions);
        this.rollupDirOptions = this.context.to(config.rollupDirOptions);
        this.rollupConfig = this.context.to(config.rollupConfig);
        this.shell = this.shell || path.normalize(path.join(this.context.getRootPath(), 'node_modules', '.bin', 'rollup'));
    }

    protected async executeBefore(): Promise<void> {
        await super.executeBefore();
        if (this.rollupDirOptions) {
            await rollup(this.rollupDirOptions);
        }
        if (this.rollupFileOptions) {
            await rollup(this.rollupFileOptions);
        }
    }


    protected formatShell(shell: string) {
        if (this.rollupConfig) {
            return shell + ' -c ' + this.rollupConfig;
        }
        shell = shell + ' ' + this.src.join(' ');
        return super.formatShell(shell);
    }

    protected formatArgs(env: ObjectMap<any>): string[] {
        let args = lang.assign({
            format: 'umd',
            file: 'bundle.js',
            dir: 'dist'
        }, env || {});
        return super.formatArgs(args);
    }
}
