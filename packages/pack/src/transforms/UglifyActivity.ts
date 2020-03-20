import { Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { TransformActivity } from './TransformActivity';
import { NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';
import uglify from 'gulp-uglify-es';

@Task('uglify, [uglify]')
export class UglifyActivity extends TransformActivity {

    @Input('uglifyOptions') options: any;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        return ctx.getData<ITransform>().pipe(this.options ? uglify(this.options) : uglify());
    }
}
