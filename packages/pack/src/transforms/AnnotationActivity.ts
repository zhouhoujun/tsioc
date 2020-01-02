import { classAnnotations } from '@tsdi/annotations';
import { Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { NodeActivityContext, ITransform, NodeExpression } from '../core';
import { TransformActivity, TransformService } from './TransformActivity';

@Task('annotation, [annotation]')
export class AnnotationActivity extends TransformActivity {

    @Input('annotationFramework', classAnnotations) framework: NodeExpression<ITransform>;
    @Input() annotation: NodeExpression<boolean>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let enable = await this.resolveExpression(this.annotation, ctx);
        if (enable) {
            this.result = await ctx.injector.get(TransformService).executePipe(ctx, this.result, this.framework);
        }
    }

}


