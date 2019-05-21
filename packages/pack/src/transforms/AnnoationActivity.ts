import { PipeActivity } from './PipeActivity';
import { NodeActivityContext, ITransform, NodeExpression } from '../core';
import { Input } from '@tsdi/boot';
import { classAnnotations } from '@tsdi/annotations';
import { Task } from '@tsdi/activities';

@Task('annoation, [annoation]')
export class AnnoationActivity extends PipeActivity {

    @Input('annotationFramework', classAnnotations)
    framework: NodeExpression<ITransform>;

    @Input()
    annoation: NodeExpression<boolean>;

    constructor(@Input() annoation: NodeExpression<boolean>) {
        super();
        this.annoation = annoation;
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let enable = await this.resolveExpression(this.annoation, ctx);
        if (enable) {
            this.result.value = await this.executePipe(ctx, this.result.value, this.framework);
        }
    }

}


