import {
    isString, createClassDecorator, MetadataExtends, MetadataAdapter,
    isClass, ITypeDecorator, Token, isToken, isUndefined, lang, ProvideToken,
    isProvideToken, ClassType, isArray
} from '@tsdi/ioc';
import { ActivityMetadata } from '../metadatas/ActivityMetadata';
import { ActivityContext } from '../core/ActivityContext';


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
     * @param {ProvideToken<any>} provide Activity name or provide.
     */
    (provide: ProvideToken<any>): ClassDecorator
    /**
     * Activity decorator, use to define class as Activity element.
     *
     * @Task
     * @param {Token<any>} provide Activity name or provide.
     * @param {string} selector metadata selector.
     * @param {string} [alias] Activity alias name.
     */
    (provide: Token<any>, selector: string, alias?: string): ClassDecorator;
    /**
     * Activity decorator, use to define class as Activity element.
     *
     * @Task
     * @param {string} provide Activity name or provide.
     * @param {Token<IActivityContext>} ctxType Activity context token.
     * @param {string} selector metadata selector.
     * @param {string} [alias]  Activity alias name
     */
    (provide: Token<any>, ctxType: Token<ActivityContext>, selector?: string, alias?: string): ClassDecorator;
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
    metadataExtends?: MetadataExtends<T>): ITaskDecorator<T> {

    return createClassDecorator<ActivityMetadata>('Task',
        args => {
            if (adapter) {
                adapter(args);
            }
            args.next<ActivityMetadata>({
                match: (arg, args) => args.length > 1 ? isToken(arg) : isProvideToken(arg),
                setMetadata: (metadata, arg) => {
                    if (isString(arg)) {
                        metadata.name = arg;
                    }
                    metadata.provide = arg;
                }
            });

            args.next<ActivityMetadata>({
                match: (arg) => isToken(arg) || isString(arg) || isArray(arg),
                setMetadata: (metadata, arg) => {
                    if (isString(arg) || isArray(arg)) {
                        metadata.selector = arg;
                    } else {
                        metadata.contextType = arg;
                    }
                }
            });

            args.next<ActivityMetadata>({
                match: (arg) => isString(arg) || isArray(arg),
                setMetadata: (metadata, arg) => {
                    metadata.selector = arg;
                }
            });

            args.next<ActivityMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.alias = arg;
                }
            });
        },
        metadata => {
            if (metadataExtends) {
                metadataExtends(metadata as T);
            }

            if (!metadata.name && isClass(metadata.type)) {
                metadata.name = lang.getClassName(metadata.type);
            }

            if (isUndefined(metadata.provide)) {
                metadata.provide = metadata.name;
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
export const Task: ITaskDecorator<ActivityMetadata> = createTaskDecorator('Task');

