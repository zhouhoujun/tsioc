import { isString, createClassDecorator, isClass, lang, ClassType } from '@tsdi/ioc';
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
export const Task: ITaskDecorator = createClassDecorator<ActivityMetadata>('Task',
    [
        (ctx, next) => {
            if (isString(ctx.currArg)) {
                ctx.metadata.selector = ctx.currArg;
                ctx.next(next);
            }
        }
    ],
    metadata => {
        if (!metadata.name && isClass(metadata.type)) {
            metadata.name = lang.getClassName(metadata.type);
        }
        return metadata;
    }) as ITaskDecorator;

