import { classAnnotations } from '@tsdi/annotations';
import { Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { PipeActivity } from './PipeActivity';
import { NodeActivityContext, ITransform, NodeExpression } from '../core';

@Task('annotation, [annotation]')
export class AnnotationActivity extends PipeActivity {

    @Input('annotationFramework', classAnnotations) framework: NodeExpression<ITransform>;
    @Input() annotation: NodeExpression<boolean>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let enable = await this.resolveExpression(this.annotation, ctx);
        if (enable) {
            this.result.value = await this.executePipe(ctx, this.result.value, this.framework);
        }
    }

}


