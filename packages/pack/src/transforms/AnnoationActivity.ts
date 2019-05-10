import { PipeActivity } from './PipeActivity';
import { NodeActivityContext, ITransform } from '../core';
import { Input } from '@tsdi/boot';
import { classAnnotations } from '@tsdi/annotations';
import { Task, Expression } from '@tsdi/activities';

@Task('annoation, [annoation]')
export class AnnoationActivity extends PipeActivity {

    @Input('annotationFramework', classAnnotations)
    framework: Expression<ITransform>;

    @Input()
    annoation: Expression<boolean>;

    constructor(@Input() annoation: Expression<boolean>) {
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


