import { Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { TransformActivity } from './TransformActivity';
import { NodeActivityContext, NodeExpression } from '../NodeActivityContext';
import { ITransform } from '../ITransform';
const uglify = require('gulp-uglify-es').default;

@Task('uglify, [uglify]')
export class UglifyActivity extends TransformActivity {

    @Input('uglifyOptions') options: NodeExpression;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        let options = await ctx.resolveExpression(this.options);
        return ctx.getData<ITransform>().pipe(options ? uglify(options) : uglify());
    }
}
