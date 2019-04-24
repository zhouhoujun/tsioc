import { ExecOptions, exec } from 'child_process';
import { isBoolean, isArray, lang, ObjectMap, isNullOrUndefined, PromiseUtil } from '@tsdi/ioc';
import { Src, Task, TemplateOption, Activity, Expression } from '@tsdi/activities';
import { NodeActivityContext } from '../core';


/**
 * shell activity config.
 *
 * @export
 * @interface ShellActivityConfig
 * @extends {ActivityConfigure}
 */
export interface ShellActivityOption<T extends NodeActivityContext> extends TemplateOption<T> {
    /**
     * shell cmd
     *
     * @type {CtxType<Src>}
     * @memberof ShellActivityConfig
     */
    shell?: Expression<Src>;
    /**
     * shell args.
     *
     * @type {CtxType<string[] | ObjectMap<any>>}
     * @memberof ShellActivityConfig
     */
    args?: Expression<string[] | ObjectMap<any>>;
    /**
     * shell exec options.
     *
     * @type {CtxType<ExecOptions>}
     * @memberof ShellActivityConfig
     */
    options?: Expression<ExecOptions>;
    /**
     * allow error or not.
     *
     * @type {CtxType<boolean>}
     * @memberof ShellActivityConfig
     */
    allowError?: Expression<boolean>;
}


/**
 * Shell Task
 *
 * @class ShellActivity
 * @implements {ITask}
 */
@Task('shell')
export class ShellActivity<T extends NodeActivityContext> extends Activity<T> {
    /**
     * shell cmd.
     *
     * @type {Src}
     * @memberof ShellActivity
     */
    shell: Expression<Src>;
    /**
     * shell args.
     *
     * @type {string[]}
     * @memberof ShellActivity
     */
    args: Expression<string[] | ObjectMap<any>>;
    /**
     * shell exec options.
     *
     * @type {CtxType<ExecOptions>}
     * @memberof ShellActivity
     */
    options: Expression<ExecOptions>;
    /**
     * allow error or not.
     *
     * @memberof ShellActivity
     */
    allowError: Expression<boolean>

    async init(option: ShellActivityOption<T>) {
        await super.init(option);
        this.shell = option.shell;
        this.args = option.args;
        this.options = option.options;
        this.allowError = option.allowError;
    }

    async run(ctx: T, next: () => Promise<void>): Promise<void> {

        let shell = await this.resolveExpression(this.shell, ctx);
        let options = await this.resolveExpression(this.options, ctx);
        let args = await this.resolveExpression(this.args, ctx);
        let argstrs = isArray(args) ? args : this.formatArgs(args);
        let allowError = await this.resolveExpression(this.allowError, ctx);

        await PromiseUtil.step((isArray(shell) ? shell : [shell]).map(sh => () => this.execShell(sh, argstrs, options, allowError)));
        await next();

    }

    protected formatShell(shell: string, args: string[]): string {
        if (args.length) {
            return shell + ' ' + args.join(' ');
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

    protected execShell(cmd: string, args: string[], options?: ExecOptions, allowError?: boolean): Promise<any> {
        cmd = this.formatShell(cmd, args);
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
                this.checkStderr(err, reject, allowError);
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

    protected checkStderr(err: string | Buffer, reject: Function, allowError: boolean) {
        console.error(err);
        if (allowError === false) {
            reject(err);
        }
    }

    protected checkStdout(data: string | Buffer, resolve: Function, reject: Function) {
        console.log(data);
    }
}
