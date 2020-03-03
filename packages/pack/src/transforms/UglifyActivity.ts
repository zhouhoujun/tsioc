import { Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { TransformActivity } from './TransformActivity';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';
import uglify from 'gulp-uglify-es';

@Task('uglify, [uglify]')
export class UglifyActivity extends TransformActivity {

    @Input('uglifyOptions') options: NodeExpression;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        let options = await ctx.resolveExpression(this.options);
        return ctx.getData<ITransform>().pipe(options ? uglify(options) : uglify());
    }
}
