import { AnnotationReflect, BootContext, BuildContext } from '@tsdi/boot';
import { lang, ClassType, createDecorator } from '@tsdi/ioc';
import { ActivityContext } from './core/ActivityContext';
import { ActivityMetadata } from './core/ActivityMetadata';
import { WorkflowContext } from './core/WorkflowContext';


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
    reflect: {
        class: (ctx, next) => {
            const reflect = ctx.reflect as AnnotationReflect;
            reflect.annoType = 'component';
            reflect.annoDecor = ctx.decor;
            const metadata = ctx.matedata as ActivityMetadata;
            if (!metadata.name) {
                metadata.name = lang.getClassName(ctx.reflect.type);
            }
            reflect.annotation = ctx.matedata;
            return next();
        }
    },
    design: {
        class: (ctx, next) => {
            const relt = ctx.reflect as AnnotationReflect;
            const annoation = relt.annotation as ActivityMetadata;
            if (annoation.deps && annoation.deps.length) {
                ctx.injector.inject(...annoation.deps);
            }
            next();
        }
    },
    providers: [
        { provide: BootContext, useClass: WorkflowContext },
        { provide: BuildContext, useClass: ActivityContext },
    ]
}) as ITaskDecorator;

