import { NodeActivity } from '@taskfr/node';
import { CompilerActivityContext } from './CompilerActivityContext';
import { ShellActivity } from '@taskfr/node';
import { ExecOptions } from 'child_process';
import { Task } from '@taskfr/core';
import { ShellCompilerActivityContext } from './ShellCompilerActivityContext';

/**
 * compiler activity.
 *
 * @export
 * @abstract
 * @class CompilerActivity
 * @extends {NodeActivity}
 */
export abstract class CompilerActivity extends NodeActivity {

    getContext(): CompilerActivityContext {
        return super.getContext() as CompilerActivityContext;
    }
    /**
     * execute build activity.
     *
     * @protected
     * @abstract
     * @returns {Promise<void>}
     * @memberof NodeActivity
     */
    protected abstract async execute(): Promise<void>;
}


/**
 * shell compiler activity.
 *
 * @export
 * @class ShellCompilerActivity
 * @extends {ShellActivity}
 */
@Task
export class ShellCompilerActivity extends ShellActivity {

    getContext(): ShellCompilerActivityContext {
        return super.getContext() as ShellCompilerActivityContext;
    }

    protected execShell(cmd: string, options?: ExecOptions): Promise<any> {
        return super.execShell(cmd, options);
    }

    protected formatShell(shell: string): string {
        return super.formatShell(shell);
    }
}
