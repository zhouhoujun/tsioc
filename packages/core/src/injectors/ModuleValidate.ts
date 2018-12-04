import { IModuleValidate, InjectModuleValidateToken } from './IModuleValidate';
import { Type, Token } from '../types';
import { isClass, isString, isArray, isToken, lang } from '../utils';
import { hasOwnClassMetadata, IocExt, IMetaAccessor, IAnnotationMetadata, AnnotationMetaAccessorToken, getClassDecorators, Injectable } from '../core';
import { IContainer } from '../IContainer';

/**
 * base module validate.
 *
 * @export
 * @abstract
 * @class BaseModuelValidate
 * @implements {IModuleValidate}
 */
export class ModuelValidate implements IModuleValidate {
    constructor() {

    }

    validate(type: Type<any>): boolean {
        if (!isClass(type)) {
            return false;
        }

        let decorator = this.getDecorator();
        if (isString(decorator)) {
            return hasOwnClassMetadata(decorator, type);
        } else if (isArray(decorator) && decorator.length) {
            if (decorator.length > 0) {
                return decorator.some(decor => hasOwnClassMetadata(decor, type))
            }
        }
        return true;
    }

    /**
     * get token of metadata config.
     *
     * @param {IAnnotationMetadata<any>} config
     * @returns {Token<any>}
     * @memberof MetadataManager
     */
    getToken(config: IAnnotationMetadata<any>, container?: IContainer): Token<any> {
        let token = this.getTokenInConfig(config);
        if (this.validateToken(token)) {
            return token;
        } else {
            return null;
        }
    }

    protected validateToken(token: Token<any>, container?: IContainer): boolean {
        if (!isToken(token)) {
            return false;
        }
        if (container) {
            if (container.has(token)) {
                return true;
            } else if (isClass(token)) {
                return true;
            }
            return false;
        }
        return true;
    }

    protected getTokenInConfig(config: IAnnotationMetadata<any>): Token<any> {
        return config.token || config.type;
    }

    /**
     * get module boot token from module configure.
     *
     * @param {IAnnotationMetadata<any>} config
     * @param {IContainer} [container]
     * @returns {Token<any>}
     * @memberof ModuelValidate
     */
    getBootToken(config: IAnnotationMetadata<any>, container?: IContainer): Token<any> {
        let token = this.getBootTokenInConfig(config);
        if (this.validateToken(token, container)) {
            return token
        } else {
            return null;
        }
    }

    protected getBootTokenInConfig(config: IAnnotationMetadata<any>) {
        return null;
    }

    getMetaConfig(token: Token<any>, container: IContainer, extConfig?: IAnnotationMetadata<any>): IAnnotationMetadata<any> {
        if (isToken(token)) {
            let accessor = this.getMetaAccessor(container);
            let decorator = this.getDecorator();
            let cfg: IAnnotationMetadata<any>;
            if (decorator) {
                if (isString(decorator)) {
                    cfg = accessor.getMetadata(token, container, d => d === decorator);
                } else if (isArray(decorator) && decorator.length) {
                    cfg = accessor.getMetadata(token, container, d => decorator.indexOf(d) >= 0);
                } else {
                    cfg = accessor.getMetadata(token, container);
                }
            } else {
                cfg = accessor.getMetadata(token, container);
            }

            if (cfg) {
                return lang.assign({}, cfg, extConfig || {});
            } else {
                return extConfig || {};
            }
        }
        return {} || extConfig;
    }

    getMetaAccessor(container: IContainer): IMetaAccessor<any> {
        return container.resolve(AnnotationMetaAccessorToken);
    }

    getDecorator(): string | string[] {
        return null;
    }
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
 * @extends {ModuelValidate}
 * @implements {IModuleValidate}
 */
export class IocExtModuleValidate extends ModuelValidate implements IModuleValidate {
    getDecorator(): string {
        return IocExt.toString();
    }
}
