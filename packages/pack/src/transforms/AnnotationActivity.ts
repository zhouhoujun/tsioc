import { classAnnotations } from '@tsdi/annotations';
import { Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { TransformActivity } from './TransformActivity';
import { NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';

@Task('annotation')
export class AnnotationActivity extends TransformActivity {

    @Input('annotationFramework', classAnnotations) framework: ITransform| (() => ITransform);
    @Input() annotation: boolean;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        let enable = this.annotation;
        if (enable) {
            return await this.pipeStream(ctx, ctx.getData<ITransform>(), this.framework);
        }
    }

}


