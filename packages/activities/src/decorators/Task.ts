import {
    isString, createClassDecorator, MetadataExtends,
    isClass, ITypeDecorator, lang, ClassType, Type, ArgsIteratorAction
} from '@tsdi/ioc';
import { ActivityConfigure } from '../core/ActivityConfigure';
import { RegFor, BootContext } from '@tsdi/boot';


/**
 * task decorator, use to define class is a task element.
 *
 * @export
 * @interface ITaskDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface ITaskDecorator<T extends ActivityConfigure> extends ITypeDecorator<T> {
    /**
     * Activity decorator, use to define class as Activity element.
     *
     * @Task
     *
     * @param {T} [metadata] Activity metadate configure.
     */
    (metadata?: T): ClassDecorator;

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
 * create task decorator.
 *
 * @export
 * @template T
 * @param {string} taskType
 * @param {(Token<IActivityBuilder> | IActivityBuilder)} builder
 * @param {InjectToken<IActivity>} provideType
 * @param {MetadataAdapter} [actions]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {ITaskDecorator<T>}
 */
export function createTaskDecorator<T extends ActivityConfigure>(
    taskType: string,
    actions?: ArgsIteratorAction<T>[],
    defaultContext?: Type<BootContext>,
    metadataExtends?: MetadataExtends<T>): ITaskDecorator<T> {

    return createClassDecorator<ActivityConfigure>(taskType,
        [
            ...(actions || []),
            (ctx, next) => {
                if (isString(ctx.currArg)) {
                    ctx.metadata.selector = ctx.currArg;
                    ctx.next(next);
                }
            }
        ],
        metadata => {
            if (metadataExtends) {
                metadataExtends(metadata as T);
            }

            metadata.regFor = metadata.regFor || RegFor.boot;

            if (!metadata.name && isClass(metadata.type)) {
                metadata.name = lang.getClassName(metadata.type);
            }

            metadata.provide = 'activity_' + metadata.selector;
            if (!metadata.contextType) {
                metadata.contextType = defaultContext;
            }
            metadata.decorType = taskType;

            return metadata;
        }) as ITaskDecorator<T>;
}

/**
 * task decorator, use to define class is a task element.
 *
 * @Task
 */
export const Task: ITaskDecorator<ActivityConfigure> = createTaskDecorator('Task');

