import { Registration, Token, MetadataAdapter, MetadataExtends, isString, isObject, isToken } from '@ts-ioc/core';
import { WorkflowMetadata } from '../metadatas/WorkflowMetadata';
import { createDIModuleDecorator, IDIModuleDecorator, IModuleBuilder } from '@ts-ioc/bootstrap';
import { IActivityBuilder, ActivityBuilderToken } from '../core/IActivityBuilder';
import { WorkflowBuilderToken } from '../injectors/DefaultWorkflowBuilder';

/**
 * workflow decorator.
 *
 * @export
 * @interface IWorkflowDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IWorkflowDecorator<T extends WorkflowMetadata> extends IDIModuleDecorator<T> {
    /**
     * task decorator, use to define class as task element.
     *
     * @Workflow
     *
     * @param {T} [metadata] task metadate configure.
     */
    (metadata?: T): ClassDecorator;

    /**
     * task decorator, use to define class as task element.
     *
     * @Task
     * @param {string} provide task name or provide.
     * @param {string} [alias] task alias name.
     */
    (provide: Registration<any> | symbol | string, alias?: string): ClassDecorator;

    /**
     * task decorator, use to define class as task element.
     *
     * @Task
     * @param {string} provide task name or provide.
     * @param {string} builder task builder token.
     * @param {string} [alias]  task alias name
     */
    (provide: Registration<any> | symbol | string, builder?: Token<IActivityBuilder>, alias?: string): ClassDecorator;

    /**
     * task decorator, use to define class as task element.
     *
     * @Task
     */
    (target: Function): void;

}

/**
 * create workflow decorator.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {Token<IModuleBuilder<any>>} [builder]
 * @param {(Token<IActivityBuilder> | IActivityBuilder)} [annotationBuilder]
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IWorkflowDecorator<T>}
 */
export function createWorkflowDecorator<T extends WorkflowMetadata>(
    name: string,
    builder?: Token<IModuleBuilder<any>>,
    annotationBuilder?: Token<IActivityBuilder> | IActivityBuilder,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IWorkflowDecorator<T> {

    return createDIModuleDecorator(name, builder, annotationBuilder, args => {
        if (adapter) {
            adapter(args);
        }
        args.next<WorkflowMetadata>({
            match: (arg) => arg && (isString(arg) || (isObject(arg) && arg instanceof Registration)),
            setMetadata: (metadata, arg) => {
                if (isString(arg)) {
                    metadata.name = arg;
                } else {
                    metadata.provide = arg;
                }
            }
        });

        args.next<WorkflowMetadata>({
            match: (arg) => isString(arg) || isToken(arg),
            setMetadata: (metadata, arg) => {
                if (isString(arg)) {
                    metadata.name = arg;
                } else {
                    metadata.annoBuilder = arg;
                }
            }
        });

        args.next<WorkflowMetadata>({
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
        metadata.defaultBuilder = WorkflowBuilderToken;
        metadata.defaultAnnoBuilder = ActivityBuilderToken;
        return metadata;
    }) as IWorkflowDecorator<T>;
}

/**
 * Workflow decorator, define for class as workflow.
 *
 * @Workflow
 */
export const Workflow: IWorkflowDecorator<WorkflowMetadata> = createWorkflowDecorator<WorkflowMetadata>('Workflow');
