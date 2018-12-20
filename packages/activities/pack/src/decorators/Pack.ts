import { ITaskDecorator, createTaskDecorator, ActivityBuilderToken } from '@taskfr/core';
import { PackConfigure } from '../core/PackConfigure';
import { PackToken } from '../core/IPackActivity';



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
export const Pack: ITaskDecorator<PackMetadata> = createTaskDecorator<PackMetadata>('Pack', ActivityBuilderToken, PackToken, 'PackActivity');
