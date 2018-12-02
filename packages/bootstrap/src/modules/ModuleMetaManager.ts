import { MetadataManager } from '../annotations';
import { ModuleMetaManagerToken, IModuleMetaManager } from './IModuleBuilder';
import { ModuleConfigure } from './ModuleConfigure';
import { Token, Injectable } from '@ts-ioc/core';


/**
 * module metadata manager.
 *
 * @export
 * @class ModuleMetaManager
 * @extends {MetadataManager}
 */
@Injectable(ModuleMetaManagerToken)
export class ModuleMetaManager extends MetadataManager implements IModuleMetaManager {

    /**
     * get module boot token from module configure.
     *
     * @param {ModuleConfigure} cfg
     * @returns {Token<any>}
     * @memberof ModuleMetaManager
     */
    getBootToken(cfg: ModuleConfigure): Token<any> {
        return cfg.bootstrap;
    }

}
