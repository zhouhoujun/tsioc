import { ITaskDecorator, createTaskDecorator } from '@taskfr/core';
import { PackConfigure } from '../core/PackConfigure';
import { PackBuilderToken, PackToken } from '../core/IPackActivity';



/**
 * asset task metadata.
 *
 * @export
 * @interface PackMetadata
 * @extends {PackConfigure}
 */
export interface PackMetadata extends PackConfigure {

}


/**
 * package task decorator, use to define class is a asset task element.
 *
 * @Pack
 */
export const Pack: ITaskDecorator<PackMetadata> = createTaskDecorator<PackMetadata>('Pack', PackBuilderToken, PackToken, 'PackActivity');
