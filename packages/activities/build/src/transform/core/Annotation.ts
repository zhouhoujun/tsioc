import { Task } from '@taskfr/core';
import { ITransformConfigure } from './ITransformConfigure';
import { TransformType } from './transformTypes';
import { StreamActivity } from './StreamActivity';
import { classAnnotations } from '@ts-ioc/annotations';


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
     * annotation framework.
     *
     * @type {TransformType}
     * @memberof AssetActivity
     */
    annotationFramework: TransformType;

    async onActivityInit(config: AnnotationsConfigure) {
        await super.onActivityInit(config);
        this.annotationFramework = await this.toExpression(config.annotationFramework);
    }

    /**
     * begin pipe.
     *
     * @protected
     * @returns {Promise<ITransform>}
     * @memberof AnnotationActivity
     */
    protected async execute(): Promise<void> {
        this.context.result = await this.executePipe(this.context.result, this.annotationFramework || (() => classAnnotations()));
    }
}
