import { ExecOptions, exec } from 'child_process';
import { isString, isBoolean, isArray, lang, ObjectMap, isNullOrUndefined } from '@ts-ioc/core';
import { Src, CtxType, OnActivityInit, Task } from '@ts-ioc/activities';
import { CompilerActivity, CompilerConfigure } from '../core';


/**
 * shell activity config.
 *
 * @export
 * @interface ShellActivityConfig
 * @extends {ActivityConfigure}
 */
export interface ShellActivityConfig extends CompilerConfigure {
    /**
     * shell cmd
     *
     * @type {CtxType<Src>}
     * @memberof ShellActivityConfig
     */
    shell?: CtxType<Src>;
    /**
     * shell args.
     *
     * @type {CtxType<string[] | ObjectMap<any>>}
     * @memberof ShellActivityConfig
     */
    args?: CtxType<string[] | ObjectMap<any>>;
    /**
     * shell exec options.
     *
     * @type {CtxType<ExecOptions>}
     * @memberof ShellActivityConfig
     */
    options?: CtxType<ExecOptions>;
    /**
     * allow error or not.
     *
     * @type {CtxType<boolean>}
     * @memberof ShellActivityConfig
     */
    allowError?: CtxType<boolean>;
}


/**
 * Shell Task
 *
 * @class ShellActivity
 * @implements {ITask}
 */
@Task('shell')
export class ShellActivity extends CompilerActivity implements OnActivityInit {
    /**
     * shell cmd.
     *
     * @type {Src}
     * @memberof ShellActivity
     */
    shell: Src;
    /**
     * shell args.
     *
     * @type {string[]}
     * @memberof ShellActivity
     */
    args: string[];
    /**
     * shell exec options.
     *
     * @type {ExecOptions}
     * @memberof ShellActivity
     */
    options: ExecOptions;
    /**
     * allow error or not.
     *
     * @memberof ShellActivity
     */
    allowError: boolean;

    async onActivityInit(config: ShellActivityConfig) {
        await super.onActivityInit(config);
        this.shell = this.context.to(config.shell);
        let args = this.context.to(config.args);
        this.args = isArray(args) ? args : this.formatArgs(args);
        this.options = this.context.to(config.options);
        this.allowError = this.context.to(config.allowError);
        if (!isBoolean(this.allowError)) {
            this.allowError = true;
        }
    }

    protected async execute(): Promise<void> {
        await this.executeBefore();
        await Promise.resolve(this.shell)
            .then(cmds => {
                let options = this.options;
                if (isString(cmds)) {
                    return this.execShell(cmds, options);
                } else if (isArray(cmds)) {
                    let pip = Promise.resolve();
                    cmds.forEach(cmd => {
                        pip = pip.then(() => this.execShell(cmd, options));
                    });
                    return pip;
                } else {
                    return Promise.reject('shell task config error');
                }
            });
        await this.executeAfter();
    }

    protected async executeBefore(): Promise<void> {

    }

    protected async executeAfter(): Promise<void> {

    }

    protected formatShell(shell: string): string {
        if (this.args && this.args.length) {
            return shell + ' ' + this.args.join(' ');
        }
        return shell;
    }

    protected formatArgs(args: ObjectMap<any>): string[] {
        let strArgs = [];
        lang.forIn(args, (val, k: string) => {
            if (k === 'root' || !/^[a-zA-Z]/.test(k)) {
                return;
            }
            if (isArray(val)) {
                strArgs.push(`--${k} ${val.join(',')}`);
            } else if (!isNullOrUndefined(val)) {
                let arg = this.formatArg(val, k, args);
                if (arg) {
                    strArgs.push(arg);
                }
            }
        });
        return strArgs;
    }

    protected formatArg(arg: any, key: string, args?: ObjectMap<any>): string {
        if (isBoolean(arg) && arg) {
            return `--${key}`;
        }
        if (!isNullOrUndefined(arg)) {
            return `--${key} ${arg}`
        }
        return '';
    }

    protected execShell(cmd: string, options?: ExecOptions): Promise<any> {
        cmd = this.formatShell(cmd);
        if (!cmd) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            let shell = exec(cmd, options, (err, stdout, stderr) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stdout);
                }
            });

            shell.stdout.on('data', data => {
                this.checkStdout(data, resolve, reject);
            });

            shell.stderr.on('data', err => {
                this.checkStderr(err, resolve, reject);
            });

            shell.on('exit', (code) => {
                let msg = `exit child process with code：${code} `;
                console.log(msg);
                if (code > 0) {
                    reject(new Error(msg));
                }
            });
        });
    }

    protected checkStderr(err: string | Buffer, resolve: Function, reject: Function) {
        console.error(err);
        if (this.allowError === false) {
            reject(err);
        }
    }

    protected checkStdout(data: string | Buffer, resolve: Function, reject: Function) {
        console.log(data);
    }
}
