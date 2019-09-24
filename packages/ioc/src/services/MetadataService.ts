import { IocCoreService } from './IocCoreService';
import { ClassType, Express, Type } from '../types';
import {
    getMethodDecorators,
    getOwnMethodMetadata
} from '../factories';
import { MethodMetadata } from '../metadatas';

/**
 * metadata services.
 *
 * @export
 * @class MetadataService
 * @extends {IocCoreService}
 */
export class MetadataService extends IocCoreService {


    /**
     * interate each method metadata.
     *
     * @param {Type} target
     * @param {string} propertyKey
     * @param {((meta: MethodMetadata, decor: string) => void | boolean)} express
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {MethodMetadata[]}
     * @memberof DecoratorRegisterer
     */
    eachMethodMetadata(target: Type, propertyKey: string, express: (meta: MethodMetadata, decor: string) => void | boolean, decorFilter?: Express<string, boolean>): MethodMetadata[] {
        let decors = getMethodDecorators(target);
        if (decorFilter) {
            decors = decors.filter(decorFilter);
        }
        let metas: MethodMetadata[] = [];
        decors.some(decor => {
            let clmetas = getOwnMethodMetadata<MethodMetadata>(decor, target);
            let methodmeta = clmetas[propertyKey];
            if (methodmeta && methodmeta.length) {
                return methodmeta.some(meta => {
                    if (meta && express(meta, decor) === false) {
                        return true;
                    }
                    return false;
                });
            }
            return false;
        });
        return metas;
    }

    getMethodMetadatas<T>(target: Type<T>, propertyKey: string, filter?: (meta: MethodMetadata, decor?: string) => boolean): MethodMetadata[] {
        let metadatas = [];
        this.eachMethodMetadata(target, propertyKey, (meta, decor) => {
            if (!meta) {
                return;
            }
            if (filter) {
                filter(meta, decor) && metadatas.push(meta);
            } else {
                metadatas.push(meta);
            }
        });
        return metadatas;
    }
}
