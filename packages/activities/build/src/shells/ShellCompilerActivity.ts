import { ShellActivity } from '@taskfr/node';
import { ShellCompilerActivityContext } from './ShellCompilerActivityContext';
import { ExecOptions } from 'child_process';
import { Task } from '@taskfr/core';

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
