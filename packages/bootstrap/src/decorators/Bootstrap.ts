import { IClassDecorator, createClassDecorator, TypeMetadata } from '@ts-ioc/core';
import { AppConfiguration } from '../AppConfiguration';


export interface BootstrapMetadata extends AppConfiguration<any>, TypeMetadata {

}

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
export const Bootstrap: IClassDecorator<BootstrapMetadata> = createClassDecorator<BootstrapMetadata>('Bootstrap');
