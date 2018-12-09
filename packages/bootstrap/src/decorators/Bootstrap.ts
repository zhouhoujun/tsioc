import {
    Token, MetadataAdapter, MetadataExtends, ITypeDecorator,
    Type, isClass, isFunction, LoadType, isObject
} from '@ts-ioc/core';
import { AppConfigure } from '../boot/AppConfigure';
import { IRunnableBuilder } from '../boot/IRunnableBuilder';
import { IAnnotationBuilder, AnnotationBuilderToken } from '../annotations/IAnnotationBuilder';
import { createDIModuleDecorator } from './DIModule';
import { ApplicationBuilderToken, ApplicationBuilder } from '../boot';


export interface BootstrapMetadata extends AppConfigure {
    /**
     * module bootstrap token.
     *
     * @type {Token<T>}
     * @memberof AnnotationConfigure
     */
    bootstrap: Token<any>;
    builder?: Type<IRunnableBuilder<any>> | IRunnableBuilder<any>;
    defaultBuilder?: Token<IRunnableBuilder<any>>,
    defaultAnnoBuilder?: Token<IAnnotationBuilder<any>>,
    globals?: LoadType[];
}


/**
 * Bootstrap decorator, use to define class is a task element.
 *
 * @export
 * @interface IBootstrapDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IBootstrapDecorator<T extends BootstrapMetadata> extends ITypeDecorator<T> {
    /**
     * Bootstrap decorator, use to define class as Application Bootstrap element.
     *
     * @Bootstrap
     *
     * @param {T} metadata bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}


/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {Token<IRunnableBuilder<any>>>} [builder] default builder
 * @param {Token<IAnnotationBuilder<any>>} [defaultAnnoBuilder] default type builder.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IBootstrapDecorator<T>}
 */
export function createBootstrapDecorator<T extends BootstrapMetadata>(
    name: string,
    defaultBuilder?: Token<IRunnableBuilder<any>>,
    defaultAnnoBuilder?: Token<IAnnotationBuilder<any>>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IBootstrapDecorator<T> {

    return createDIModuleDecorator<BootstrapMetadata>(name, defaultBuilder, defaultAnnoBuilder, adapter, (metadata: T) => {
        if (metadataExtends) {
            metadataExtends(metadata);
        }
        if (metadata.builder) {
            setTimeout(() => {
                ApplicationBuilder.create()
                    .use(...(metadata.globals || []))
                    .bootstrap(metadata);
            }, 300);
        }
        return metadata;
    }) as IBootstrapDecorator<T>;
}

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
export const Bootstrap: IBootstrapDecorator<BootstrapMetadata> = createBootstrapDecorator<BootstrapMetadata>('Bootstrap', ApplicationBuilderToken, AnnotationBuilderToken);
