import { Singleton, InjectModuleValidateToken, BaseModuelValidate, IModuleValidate } from '@ts-ioc/core';
import { DIModule } from '../decorators';

/**
 * DIModuel Validate Token
 */
export const DIModuelValidateToken = new InjectModuleValidateToken<IModuleValidate>(DIModule.toString());

/**
 * DIModuel Validate
 *
 * @export
 * @class DIModuelValidate
 * @extends {BaseModuelValidate}
 */
@Singleton(DIModuelValidateToken)
export class DIModuelValidate extends BaseModuelValidate {
    getDecorator() {
        return DIModule.toString();
    }
}
