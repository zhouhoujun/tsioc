import { Singleton, InjectModuleValidateToken, ModuelValidate, IModuleValidate, Token, IContainer } from '@ts-ioc/core';
import { DIModule } from '../decorators';
import { ModuleConfigure } from './ModuleConfigure';



/**
 * DIModule Validate Token
 */
export const DIModuleValidateToken = new InjectModuleValidateToken<IModuleValidate>(DIModule.toString());


/**
 * DIModuel Validate
 *
 * @export
 * @class DIModuelValidate
 * @extends {ModuelValidate}
 */
@Singleton(DIModuleValidateToken)
export class DIModuelValidate extends ModuelValidate {
    getDecorator(): string {
        return DIModule.toString();
    }

    protected getBootTokenInConfig(cfg: ModuleConfigure) {
        return cfg.bootstrap;
    }

}
