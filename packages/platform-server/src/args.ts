import { ApplicationArguments } from '@tsdi/core';
import { isString, EMPTY } from '@tsdi/ioc';


const isArg = /^--/;
const isNum = /^\d+(.\d+)?$/;
export class ServerApplicationArguments extends ApplicationArguments {
    private _signls: string[];
    private _args: Record<string, any>;
    private _cmds?: string[];

    constructor(private _env: Record<string, string | undefined>, private _source: string[]) {
        super()
        this._args = this.toRecord(_source);
        this._env = this._env || {};
        this._signls = this.tryGetSignls()
    }

    get env() {
        return this._env
    }
    get argsSource(): string[] {
        return this._source
    }
    get args(): Record<string, string> {
        return this._args
    }

    get cmds() {
        return this._cmds || EMPTY
    }

    get signls(): string[] {
        return this._signls
    }

    reset(args: string[]): void {
        this._source = args;
        this._args = this.toRecord(args);
        this._signls = this.tryGetSignls()
    }

    protected toRecord(args: string[]): Record<string, string | boolean | number> {
        const argr = {} as Record<string, string | boolean | number>;
        const cmds: string[] = this._cmds = [];
        args.forEach(arg => {
            if (isArg.test(arg)) {
                const [k, val] = arg.slice(2).split('=');
                if (isNum.test(val)) {
                    argr[k] = val.indexOf('.') ? parseFloat(val) : parseInt(val)
                } else if (val) {
                    argr[k] = val
                } else {
                    argr[k] = true
                }
            } else {
                cmds.push(arg)
            }
        });
        return argr
    }

    protected tryGetSignls() {
        const sigs = this.env.signls || this._args.signls;
        return sigs ? (isString(sigs) ? sigs.split(',') : signls) : EMPTY
    }
}

const signls = [
    'SIGHUP',
    'SIGINT',
    'SIGQUIT',
    'SIGILL',
    'SIGTRAP',
    'SIGABRT',
    'SIGBUS',
    'SIGFPE',
    'SIGSEGV',
    'SIGUSR2',
    'SIGTERM',
];
