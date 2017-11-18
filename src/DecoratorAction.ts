import { Type } from './Type';
import { DecoratorType } from './decorators/DecoratorType';
import { PropertyMetadata } from './decorators/Metadata';
import { ObjectMap, Token } from './types';
import { ParameterMetadata, IParamPropMetadata } from './index';

export interface DecoratorAction<T> {
    /**
     * decorator name.
     *
     * @type {string}
     * @memberof DecoratorAction
     */
    name?: string;
    /**
     * decorator type.
     *
     * @type {DecoratorType}
     * @memberof DecoratorAction
     */
    type?: DecoratorType;
    /**
     * get decorator type.
     *
     * @param {T} metadata
     * @returns {Type<any>}
     * @memberof DecoratorAction
     */
    getType?(metadata: T): Type<any>;

}


export interface ClassDecoratorAction<T> extends DecoratorAction<T> {
    /**
     * get provider type.
     *
     * @param {T} metadata
     * @returns {Type<any>}
     * @memberof DecoratorAction
     */
    getProvider?(metadata: T): Token<T>;

    /**
     * init instance.
     *
     * @param {*} instance
     * @memberof DecoratorAction
     */
    init?(instance: any): void
}

export interface PropDecoratorAction<T extends PropertyMetadata> extends DecoratorAction<T> {
    toMetadataList(metadatas: ObjectMap<T[]>): T[];
    setProperty?(design: Type<any>, metadata: T): void;
}

export interface ParamDecoratorAction<T extends ParameterMetadata> extends DecoratorAction<T> {
    resetParamType?(designParams: Type<any>[], metadatas: Array<T[]>): Type<any>[];
}

export interface ParamPropDecoratorAction<T extends IParamPropMetadata> extends PropDecoratorAction<T>, ParamDecoratorAction<T> {

}
