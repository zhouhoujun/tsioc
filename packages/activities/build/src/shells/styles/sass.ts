import * as fs from 'fs';
import * as path from 'path'
import { Task } from '@taskfr/core';
import { mkdir } from 'shelljs';
import { ShellActivity } from '../ShellActivity';



/**
 * SassBuilder activity.
 *
 * @export
 * @class SassBuilderActivity
 * @extends {BuildActivity}
 */
@Task('sass')
export class SassBuilderActivity extends ShellActivity {

    constructor() {
        super();
    }

    protected async execute(): Promise<void> {
        let ctx = this.context;
        let dist = await this.resolveExpression(ctx.getDist());
        if (dist) {
            dist = ctx.relativeRoot(dist);
            if (fs.existsSync(dist)) {
                mkdir('-p', dist);
            }
        }
    }
}
