import { IModuleValidate, InjectModuleValidateToken } from './IModuleValidate';
import { Type, Token } from '../types';
import { isClass, isString, isArray, isToken } from '../utils';
import { hasOwnClassMetadata, IocExt } from '../core';
import { IMetaAccessor, IAnnotationMetadata, AnnotationMetaAccessorToken } from './IMetaAccessor';
import { IContainer } from '../IContainer';

/**
 * base module validate.
 *
 * @export
 * @abstract
 * @class BaseModuelValidate
 * @implements {IModuleValidate}
 */
export abstract class BaseModuelValidate implements IModuleValidate {
    constructor() {

    }

    validate(type: Type<any>): boolean {
        if (!isClass(type)) {
            return false;
        }
        let decorator = this.getDecorator();
        if (isString(decorator)) {
            return hasOwnClassMetadata(decorator, type);
        } else if (isArray(decorator)) {
            if (decorator.length > 0) {
                return decorator.some(decor => hasOwnClassMetadata(decor, type))
            }
        }
        return false;
    }

    getMetaConfig(token: Token<any>, container: IContainer): IAnnotationMetadata<any> {
        if (isToken(token)) {
            let accessor = this.getMetaAccessor(container);
            return accessor.getMetadata(token, container);
        }
        return {};
    }

    getMetaAccessor(container: IContainer): IMetaAccessor<any> {
        let decorator = this.getDecorator();
        return container.resolve(AnnotationMetaAccessorToken, { decorator: decorator });
    }

    abstract getDecorator(): string | string[];
}

/**
 * IocExt module validate token.
 */
export const IocExtModuleValidateToken = new InjectModuleValidateToken(IocExt.toString());
/**
 * IocExt module validate.
 *
 * @export
 * @class IocExtModuleValidate
 * @extends {BaseModuelValidate}
 * @implements {IModuleValidate}
 */
export class IocExtModuleValidate extends BaseModuelValidate implements IModuleValidate {
    getDecorator(): string {
        return IocExt.toString()
    }
}
