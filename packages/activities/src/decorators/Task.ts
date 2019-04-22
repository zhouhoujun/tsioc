import {
    isString, createClassDecorator, MetadataExtends, MetadataAdapter,
    isClass, ITypeDecorator, lang, ClassType, Type
} from '@tsdi/ioc';
import { ActivityMetadata } from '../metadatas/ActivityMetadata';
import { RegScope, BootContext } from '@tsdi/boot';


/**
 * task decorator, use to define class is a task element.
 *
 * @export
 * @interface ITaskDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface ITaskDecorator<T extends ActivityMetadata> extends ITypeDecorator<T> {
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
    (target: ClassType<any>): void;
}

/**
 * create task decorator.
 *
 * @export
 * @template T
 * @param {string} taskType
 * @param {(Token<IActivityBuilder> | IActivityBuilder)} builder
 * @param {InjectToken<IActivity>} provideType
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {ITaskDecorator<T>}
 */
export function createTaskDecorator<T extends ActivityMetadata>(
    taskType: string,
    adapter?: MetadataAdapter,
    defaultContext?: Type<BootContext>,
    metadataExtends?: MetadataExtends<T>): ITaskDecorator<T> {

    return createClassDecorator<ActivityMetadata>('Task',
        args => {
            if (adapter) {
                adapter(args);
            }
            args.next<ActivityMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.selector = arg;
                }
            });

        },
        metadata => {
            if (metadataExtends) {
                metadataExtends(metadata as T);
            }

            metadata.regScope = metadata.regScope || RegScope.boot;

            if (!metadata.name && isClass(metadata.type)) {
                metadata.name = lang.getClassName(metadata.type);
            }

            metadata.provide = metadata.selector;
            metadata.contextType = defaultContext;
            metadata.decorType = taskType;

            return metadata;
        }) as ITaskDecorator<T>;
}

/**
 * task decorator, use to define class is a task element.
 *
 * @Task
 */
export const Task: ITaskDecorator<ActivityMetadata> = createTaskDecorator('Task');

