import * as path from 'path';
import { Task, Src, CtxType } from '@tsdi/activities';
import { lang, ObjectMap } from '@tsdi/ioc';
import { RollupDirOptions, RollupFileOptions, rollup } from 'rollup';
import { ShellActivity, ShellActivityConfig } from '../ShellActivity';

/**
 * rollup command options.
 *
 * @export
 * @interface RollupCmdOptions
 */
export interface RollupCmdOptions {
    /**
     * rollup format type.
     *
     * @type {string}
     * @memberof RollupCmdOptions
     */
    format: string,
    /**
     * file to rollup.
     *
     * @type {string}
     * @memberof RollupCmdOptions
     */
    file: string,
    /**
     * output dir.
     *
     * @type {string}
     * @memberof RollupCmdOptions
     */
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
    /**
     * rollup dir options.
     *
     * @type {RollupDirOptions}
     * @memberof RollupActivity
     */
    rollupDirOptions: RollupDirOptions;
    /**
     * rollup file options.
     *
     * @type {RollupFileOptions}
     * @memberof RollupActivity
     */
    rollupFileOptions: RollupFileOptions;

    async onActivityInit(config: RollupActivityConfig) {
        await super.onActivityInit(config);
        this.src = await this.context.getFiles(this.context.to(config.src));
        this.options = Object.assign({ silent: true }, this.options || {});
        this.rollupFileOptions = this.context.to(config.rollupFileOptions);
        this.rollupDirOptions = this.context.to(config.rollupDirOptions);
        this.rollupConfig = this.context.to(config.rollupConfig);
        this.shell = this.shell || path.normalize(path.join(this.context.getRootPath(), 'node_modules', '.bin', 'rollup'));
    }

    protected async execute(): Promise<void> {
        if (this.rollupDirOptions) {
            await rollup(this.rollupDirOptions);
        } else if (this.rollupFileOptions) {
            await rollup(this.rollupFileOptions);
        } else {
            await super.execute();
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
        let args = Object.assign({
            format: 'umd',
            file: 'bundle.js',
            dir: 'dist'
        }, env || {});
        return super.formatArgs(args);
    }
}
