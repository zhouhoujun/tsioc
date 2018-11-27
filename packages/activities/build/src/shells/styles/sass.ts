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
        let ctx = this.getContext();
        let dist = path.join(ctx.builder.dist, ctx.handle.subDist);
        if (fs.existsSync(dist)) {
            mkdir('-p', dist);
        }
    }
}
