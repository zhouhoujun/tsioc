import { createClassDecorator, ITypeDecorator } from '../factories/index';
import { ClassMetadata } from '../metadatas/index';
import { Registration } from '../../Registration';
import { ModuleConfiguration } from '../../ModuleConfiguration';


export interface IModuleMetadata extends ClassMetadata, ModuleConfiguration {

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

