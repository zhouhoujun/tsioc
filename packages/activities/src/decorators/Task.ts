import {
    isString, createClassDecorator, MetadataExtends, MetadataAdapter,
    isClass, ITypeDecorator, Token, isToken, isUndefined, lang, ProvideToken, isProvideToken, ClassType
} from '@tsdi/ioc';
import { ActivityMetadata } from '../metadatas/ActivityMetadata';
import { IActivityContext } from '../core/IActivityContext';
import { IActivity } from '../core/IActivity';
import { WorkflowInstanceToken } from '../core/IWorkflowInstance';
import { ActivityBuilder } from '../core/ActivityBuilder';


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
    (provide: Token<any>, ctxType: Token<IActivityContext>, selector?: string, alias?: string): ClassDecorator;
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
    defaultBoot?: Token<IActivity> | ((meta: T) => Token<IActivity>),
    baseClassName?: string,
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
                match: (arg) => isToken(arg) || isString(arg),
                setMetadata: (metadata, arg) => {
                    if (isString(arg)) {
                        metadata.selector = arg;
                    } else {
                        metadata.contextType = arg;
                    }
                }
            });

            args.next<ActivityMetadata>({
                match: (arg) => isToken(arg) || isString(arg),
                setMetadata: (metadata, arg) => {
                    if (isString(arg)) {
                        metadata.selector = arg;
                    }
                }
            });

            args.next<ActivityMetadata>({
                match: (arg) => isString(arg),
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

            if (metadata.selector) {
                metadata.refs = { provide: metadata.selector, target: metadata.type }
            }

            metadata.decorType = taskType;
            metadata.defaultRunnable = WorkflowInstanceToken;

            let defboot = isToken(defaultBoot) ? defaultBoot : defaultBoot(metadata as T);

            if (defboot
                && !metadata.activity
                && !metadata.task
                && !lang.isExtendsClass(metadata.type, ty => lang.getClassName(ty) === (baseClassName || 'Activity'))) {
                metadata.bootstrap = defboot;
            }

            return metadata;
        }) as ITaskDecorator<T>;
}

/**
 * task decorator, use to define class is a task element.
 *
 * @Task
 */
export const Task: ITaskDecorator<ActivityMetadata> = createTaskDecorator('Task', ActivityBuilder);

