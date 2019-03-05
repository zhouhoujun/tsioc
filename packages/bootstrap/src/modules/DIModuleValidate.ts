import { Singleton } from '@ts-ioc/ioc';
import { ModuelValidate } from '@ts-ioc/core';


/**
 * DIModuel Validate
 *
 * @export
 * @class DIModuelValidate
 * @extends {ModuelValidate}
 */
@Singleton
export class DIModuelValidate extends ModuelValidate {
    getDecorator(): string {
        return '@DIModule';
    }
}


