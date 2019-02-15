import { Singleton, InjectModuleValidateToken, ModuelValidate, IModuleValidate } from '@ts-ioc/core';



/**
 * DIModule Validate Token
 */
export const DIModuleValidateToken = new InjectModuleValidateToken<IModuleValidate>('@DIModule');

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
        return '@DIModule';
    }
}


