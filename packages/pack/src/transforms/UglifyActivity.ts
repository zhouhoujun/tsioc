import { Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { TransformActivity, TransformService } from './TransformActivity';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';
const uglify = require('gulp-uglify');


@Task('uglify, [uglify]')
export class UglifyActivity extends TransformActivity {

    @Input('uglifyOptions') options: NodeExpression;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        let options = await ctx.resolveExpression(this.options);
        return await ctx.injector.getInstance(TransformService).executePipe(ctx, ctx.input, options ? uglify(options) : uglify());
    }
}
