import { AnnotationReflect } from '@tsdi/boot';
import { lang, ClassType, createDecorator } from '@tsdi/ioc';
import { ActivityMetadata } from '../core/ActivityMetadata';


/**
 * task decorator, use to define class is a task element.
 *
 * @export
 * @interface ITaskDecorator
 * @template T
 */
export interface ITaskDecorator {
    /**
     * Activity decorator, use to define class as Activity element.
     *
     * @Task
     *
     * @param {ActivityMetadata} [metadata] Activity metadate configure.
     */
    (metadata?: ActivityMetadata): ClassDecorator;

    /**
     * Activity decorator, use to define class as Activity element.
     *
     * @Task
     * @param {string} selector metadata selector.
     */
    (selector: string): ClassDecorator;

    /**
     * task decorator, use to define class as task element.
     *
     * @Task
     */
    (target: ClassType): void;
}

/**
 * task decorator, use to define class is a task element.
 *
 * @Task
 */
export const Task: ITaskDecorator = createDecorator<ActivityMetadata>('Task', {
    actionType: 'annoation',
    props: (selector: string) => ({ selector }),
    classHandle: (ctx, next) => {
        const reflect = ctx.reflect as AnnotationReflect;
        reflect.annoType = 'component';
        reflect.annoDecor = ctx.decor;
        const metadata = ctx.matedata  as ActivityMetadata;
        if (!metadata.name) {
            metadata.name = lang.getClassName(ctx.reflect.type);
        }
        reflect.annotation = ctx.matedata;
        return next();
    }
}) as ITaskDecorator;

