import { ITaskDecorator, createTaskDecorator, ActivityBuilder } from '@ts-ioc/activities';
import { PackConfigure } from '../core/PackConfigure';
import { PackToken } from '../core/IPackActivity';
import * as path from 'path';


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
export const Pack: ITaskDecorator<PackMetadata> = createTaskDecorator<PackMetadata>('Pack', ActivityBuilder, (meta) => {
    if (!meta.baseURL) {
        let cwd = process.cwd();
        meta.baseURL = path.join(path.dirname(cwd), path.basename(cwd));
    }
    if (!meta.title) {
        meta.title = '        Build Pack';
    }
    return PackToken;
}, 'PackActivity');
