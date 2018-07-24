import {
    ClassMetadata, Token, InjectToken, MetadataAdapter,
    MetadataExtends, ITypeDecorator, createClassDecorator, isClass
} from '@ts-ioc/core';
import { AppConfiguration } from '../AppConfiguration';
import { IApplication, ApplicationToken } from '../IApplication';
import { IApplicationBuilder, ApplicationBuilderToken } from '../IApplicationBuilder';


export interface BootstrapMetadata extends AppConfiguration<any>, ClassMetadata {
    decorType?: string;
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
 * @param {string} decorType
 * @param {(Token<IModuleBuilder<T>> | IModuleBuilder<T>)} builder
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IBootstrapDecorator<T>}
 */
export function createBootstrapDecorator<T extends BootstrapMetadata>(
    decorType: string,
    builder: Token<IApplicationBuilder<T>> | IApplicationBuilder<T>,
    provideType: InjectToken<IApplication>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IBootstrapDecorator<T> {

    return createClassDecorator<BootstrapMetadata>('Bootstrap',
        args => {
            if (adapter) {
                adapter(args);
            }
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

            metadata.provide = metadata.provide || provideType;
            metadata.alias = metadata.alias || metadata.name;

            metadata.decorType = decorType;
            if (!metadata.builder) {
                metadata.builder = builder;
            }
            return metadata;
        }) as IBootstrapDecorator<T>;
}

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
export const Bootstrap: IBootstrapDecorator<BootstrapMetadata> = createBootstrapDecorator<BootstrapMetadata>('bootstrap', ApplicationBuilderToken, ApplicationToken);
