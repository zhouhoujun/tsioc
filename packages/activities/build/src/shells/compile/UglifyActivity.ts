import * as path from 'path';
import { ShellActivityConfig } from '@taskfr/node';
import { Task, Src, CtxType } from '@taskfr/core';
import { lang, ObjectMap } from '@ts-ioc/core';
import { ShellCompilerActivity } from '../ShellCompilerActivity';

/**
 * uglify activity config.
 *
 * @export
 * @interface UglifyActivityConfig
 * @extends {ShellActivityConfig}
 */
export interface ShellUglifyConfigure extends ShellActivityConfig {
    /**
     * ts file source.
     *
     * @type {CtxType<Src>}
     * @memberof TscBuilderActivityConfig
     */
    src?: CtxType<Src>;

    /**
     * ts compile out dir.
     *
     * @type {CtxType<string>}
     * @memberof TscBuilderActivityConfig
     */
    dist?: CtxType<string>;

    /**
     * bundle name.
     *
     * @type {CtxType<string>}
     * @memberof UglifyActivityConfig
     */
    bundle?: CtxType<string>;

    /**
     * uglify options.
     *
     * @type {CtxType<ObjectMap<any>>}
     * @memberof UglifyActivityConfig
     */
    uglifyOptions?: CtxType<ObjectMap<any>>;
}


/**
 * uglify activity.
 *
 * @export
 * @class UglifyActivity
 * @extends {ShellCompilerActivity}
 */
@Task('uglify')
export class ShellUglifyActivity extends ShellCompilerActivity {

    /**
     * src
     *
     * @type {Src}
     * @memberof UglifyActivity
     */
    src: Src;
    /**
     * output dist.
     *
     * @type {string}
     * @memberof UglifyActivity
     */
    dist: string;
    /**
     * bundle file name.
     *
     * @type {string}
     * @memberof UglifyActivity
     */
    bundle: string;

    /**
     * uglify options.
     *
     * @type {ObjectMap<any>}
     * @memberof UglifyActivity
     */
    uglifyOptions: ObjectMap<any>;

    async onActivityInit(config: ShellUglifyConfigure) {
        await super.onActivityInit(config);
        this.options = lang.assign({ silent: true }, this.options || {});
        this.src = await this.getContext().getFiles(this.getContext().to(config.src));
        this.dist = this.getContext().to(config.dist);
        this.uglifyOptions = this.getContext().to(config.uglifyOptions);
        this.bundle = this.getContext().to(config.bundle) || 'bundle.js';
        this.shell = this.shell || path.normalize(path.join(this.getContext().getRootPath(), 'node_modules', '.bin', 'uglifyjs'));
    }

    protected formatShell(shell: string) {
        let outfile = path.join(this.dist, this.bundle)
        shell = shell + ' ' + outfile + ' -o ' + outfile;
        return super.formatShell(shell);
    }

    protected formatArgs(env: ObjectMap<any>): string[] {
        let args = lang.assign({
            compress: true,
            mangle: true,
            toplevel: true,
            verbose: true
        }, env || {}, this.uglifyOptions);
        return super.formatArgs(args);
    }
}
