import * as path from 'path';
import * as fs from 'fs';
import { Task, Src, CtxType } from '@tsdi/activities';
import { ShellActivity, ShellActivityConfig } from '../ShellActivity';

/**
 * bable build activity config
 *
 * @export
 * @interface BabelCompileActivityConfig
 * @extends {ShellActivityConfig}
 */
export interface BabelCompileActivityConfig extends ShellActivityConfig {

    /**
     * ts file source.
     *
     * @type {CtxType<Src>}
     * @memberof TscCompileActivityConfig
     */
    src?: CtxType<Src>;

    /**
     * balel compile out dir.
     *
     * @type {CtxType<string>}
     * @memberof TscCompileActivityConfig
     */
    outFile?: CtxType<string>;

    /**
     * format.
     *
     * @type {CtxType<string>}
     * @memberof BabelCompileActivityConfig
     */
    format?: CtxType<string>;
}

/**
 * babel compile activity.
 *
 * @export
 * @class BabelCompileActivity
 * @extends {ShellActivity}
 */
@Task('babel')
export class BabelCompileActivity extends ShellActivity {
    /**
     * ts file src
     *
     * @type {Src}
     * @memberof TscCompileActivity
     */
    src: Src;
    /**
     * out put file.
     *
     * @type {string}
     * @memberof TscCompileActivity
     */
    outFile: string;

    /**
     * format.
     *
     * @type {string}
     * @memberof BabelCompileActivity
     */
    format?: string;

    async onActivityInit(config: BabelCompileActivityConfig) {
        await super.onActivityInit(config);
        this.src = await this.context.getFiles(this.context.to(config.src));
        this.outFile = this.context.to(config.outFile);
        this.format = this.context.to(config.format);
        this.shell = this.shell || path.normalize(path.join(this.context.getRootPath(), 'node_modules', '.bin', 'babel'));
    }

    protected formatShell(shell: string): string {
        let outFile = path.normalize(this.outFile);
        if (this.format === 'umd') {
            return shell +
                ' --source-maps' +
                ' --presets=es2015-rollup ' +
                ' --plugins=transform-es2015-modules-commonjs ' +
                ' --module umd ' +
                outFile +
                ' --out-file ' + outFile;
        }
        shell = shell +
            ' --source-maps' +
            ' --presets=es2015-rollup ' + outFile +
            ' --out-file ' + outFile;
        return super.formatShell(shell);
    }

    /**
     * after run sequence.
     *
     * @protected
     * @param {*} [data]
     * @returns {Promise<void>}
     * @memberof ContextActivity
     */
    protected async executeAfter(): Promise<void> {
        await super.executeAfter();
        let output = await this.execShell(path.normalize(path.join(this.context.getRootPath(), './node_modules/.bin/babel-external-helpers')) +
            ' --output-type global ', { silent: true } as any);
        let outFile = path.normalize(this.outFile);
        await new Promise((res, rej) => {
            fs.readFile(path.normalize(outFile), 'utf8', (err, contents) => {
                if (err) {
                    rej(err);
                }
                if (!err) {
                    if (this.format === 'umd') {
                        contents = contents.replace("'use strict';", "'use strict';" + '\n' + output);
                    } else {
                        contents = output + '\n' + contents;
                    }
                    fs.writeFile(path.normalize(outFile), contents, 'utf-8', () => {
                        res(outFile);
                    });
                }
            });
        });
    }

}
