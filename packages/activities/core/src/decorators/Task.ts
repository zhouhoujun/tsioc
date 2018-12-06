import {
    isString, isObject, createClassDecorator, MetadataExtends, MetadataAdapter,
    isClass, ITypeDecorator, Token, Registration, isToken, isUndefined, lang, getClassName
} from '@ts-ioc/core';
import { ActivityMetadata } from '../metadatas/ActivityMetadata';
import { IActivityBuilder, ActivityBuilderToken } from '../core/IActivityBuilder';
import { IActivityContext } from '../core/IActivityContext';
import { WorkflowBuilderToken } from '../injectors/DefaultWorkflowBuilder';
import { IActivity, ActivityToken } from '../core';

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
     * @param {string} provide Activity name or provide.
     * @param {string} [alias] Activity alias name.
     */
    (provide: Registration<any> | symbol | string, alias?: string): ClassDecorator;
    /**
     * Activity decorator, use to define class as Activity element.
     *
     * @Task
     * @param {string} provide Activity name or provide.
     * @param {string} ctxType Activity context token.
     * @param {string} [alias]  Activity alias name
     */
    (provide: Registration<any> | symbol | string, ctxType: Token<IActivityContext>, alias?: string): ClassDecorator;
    /**
     * Activity decorator, use to define class as Activity element.
     *
     * @Task
     * @param {string} provide Activity name or provide.
     * @param {string} ctxType Activity context token.
     * @param {string} builder Activity builder token.
     * @param {string} [alias]  Activity alias name
     */
    (provide: Registration<any> | symbol | string, ctxType: Token<IActivityContext>, builder: Token<IActivityBuilder>, alias?: string): ClassDecorator;
    /**
     * task decorator, use to define class as task element.
     *
     * @Task
     */
    (target: Function): void;
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
    defaultAnnoBuilder?: Token<IActivityBuilder>,
    defaultBoot?: Token<IActivity>,
    baseClassName?: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): ITaskDecorator<T> {

    return createClassDecorator<ActivityMetadata>('Task',
        args => {
            if (adapter) {
                adapter(args);
            }
            args.next<ActivityMetadata>({
                match: (arg) => isString(arg) || (isObject(arg) && arg instanceof Registration),
                setMetadata: (metadata, arg) => {
                    if (isString(arg)) {
                        metadata.name = arg;
                    }
                    metadata.provide = arg;
                }
            });

            args.next<ActivityMetadata>({
                match: (arg) => isToken(arg) || isToken(arg),
                setMetadata: (metadata, arg) => {
                    if (isString(arg)) {
                        metadata.name = arg;
                    } else {
                        metadata.contextType = arg;
                    }
                }
            });

            args.next<ActivityMetadata>({
                match: (arg) => isString(arg) || isToken(arg),
                setMetadata: (metadata, arg) => {
                    if (isString(arg)) {
                        metadata.name = arg;
                    } else {
                        metadata.annoBuilder = arg;
                    }
                }
            });

            args.next<ActivityMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.name = arg;
                }
            });
        },
        metadata => {
            if (metadataExtends) {
                metadata = metadataExtends(metadata as T);
            }

            if (!metadata.name && isClass(metadata.type)) {
                let isuglify = /^[a-z]$/.test(metadata.type.name);
                if (isuglify && metadata.type.classAnnations) {
                    metadata.name = metadata.type.classAnnations.name;
                } else {
                    metadata.name = metadata.type.name;
                }
            }

            if (isUndefined(metadata.provide)) {
                metadata.provide = metadata.name;
            }

            if (defaultBoot && !metadata.activity && !metadata.task && !lang.isExtendsClass(metadata.type, ty => getClassName(ty) === (baseClassName || 'Activity'))) {
                metadata.bootstrap = defaultBoot;
            }

            metadata.decorType = taskType;
            metadata.defaultBuilder = WorkflowBuilderToken;
            metadata.defaultAnnoBuilder = defaultAnnoBuilder;

            return metadata;
        }) as ITaskDecorator<T>;
}

/**
 * task decorator, use to define class is a task element.
 *
 * @Task
 */
export const Task: ITaskDecorator<ActivityMetadata> = createTaskDecorator('Task', ActivityBuilderToken, ActivityToken);

