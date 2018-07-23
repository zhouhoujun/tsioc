import { createClassDecorator, ITypeDecorator, ClassMetadata } from '@ts-ioc/core';
import { ModuleConfiguration } from '../ModuleConfiguration';


export interface IModuleMetadata extends ClassMetadata, ModuleConfiguration<any> {

}

/**
 * Module decorator
 *
 * @export
 * @interface IModuleDecorator
 * @extends {ITypeDecorator<IModuleMetadata>}
 */
export interface IModuleDecorator extends ITypeDecorator<IModuleMetadata> {

}


/**
 * Module decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @DefModule
 */
export const DefModule: IModuleDecorator = createClassDecorator<IModuleMetadata>('DefModule');

