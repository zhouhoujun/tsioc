import { Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { NodeActivityContext, NodeExpression } from '../core';
import { TransformActivity, TransformService } from './TransformActivity';
const uglify = require('gulp-uglify');


@Task('uglify, [uglify]')
export class UglifyActivity extends TransformActivity {

    @Input('uglifyOptions') options: NodeExpression;
    @Input() uglify: NodeExpression<boolean>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let enable = await this.resolveExpression(this.uglify, ctx);
        if (enable) {
            let options = await this.resolveExpression(this.options, ctx);
            this.result = await ctx.injector.getInstance(TransformService).executePipe(ctx, this.result, options ? uglify(options) : uglify());
        }
    }
}
