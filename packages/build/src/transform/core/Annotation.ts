import { Task } from '@tsdi/activities';
import { ITransformConfigure } from './ITransformConfigure';
import { TransformType } from './transformTypes';
import { StreamActivity } from './StreamActivity';
import { classAnnotations } from '@tsdi/annotations';


export interface AnnotationsConfigure extends ITransformConfigure {
    /**
     * annotation framework.
     *
     * @type {TransformType}
     * @memberof AnnotationConfigure
     */
    annotationFramework: TransformType
}

/**
 * annotation activity.
 *
 * @export
 * @class AnnotationActivity
 * @extends {PipeActivity}
 */
@Task
export class AnnotationActivity extends StreamActivity {

    /**
     * begin pipe.
     *
     * @protected
     * @returns {Promise<ITransform>}
     * @memberof AnnotationActivity
     */
    protected async execute(): Promise<void> {
        let annotation = await this.toExpression(this.context.config.annotationFramework);
        this.context.result = await this.executePipe(this.context.result, annotation || (() => classAnnotations()));
    }
}
