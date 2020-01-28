import { classAnnotations } from '@tsdi/annotations';
import { Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { TransformActivity, TransformService } from './TransformActivity';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';

@Task('annotation, [annotation]')
export class AnnotationActivity extends TransformActivity {

    @Input('annotationFramework', classAnnotations) framework: NodeExpression<ITransform>;
    @Input() annotation: NodeExpression<boolean>;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        let enable = await ctx.resolveExpression(this.annotation);
        if (enable) {
           return await ctx.injector.getInstance(TransformService).executePipe(ctx, ctx.output, this.framework);
        }
    }

}


