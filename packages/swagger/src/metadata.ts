import { Type, createDecorator, createParamDecorator } from '@tsdi/ioc';

/**
 * api Operation decorator for swagger.
 */
export interface ApiOperation {
    (summary: string, notes?: string): PropertyDecorator;
}

export const ApiOperation: ApiOperation = createDecorator('ApiOperation', {

});

export interface ApiParamMetadata {
    required?: boolean;
    value?: string;
    access?: string;
    allowMultiple?: boolean;
    name?: string;
    notes?: string;
    dataType?: string;
    hidden?: boolean;
    readonly?: boolean;
    example?: string;
    examples?: any[] | Record<string, any>;
    description?: string;
    enum?: any[] | Record<string, any>;
    enumName?: string;
}

export interface ParameterObject extends ApiParamMetadata {
    in: string;
}

/**
 * api param.
 */
export interface ApiParam {
    (option: ApiParamMetadata): ParameterDecorator;
}

export const ApiParam: ApiParam = createParamDecorator<ParameterObject>('ApiParam', {
    appendProps(metadata) {
        metadata.in = 'path'
    }
});


/**
 * api query.
 */
export interface ApiQuery {
    (option: ApiParamMetadata): ParameterDecorator;
}

export const ApiQuery: ApiQuery = createParamDecorator<ParameterObject>('ApiQuery', {
    appendProps(metadata) {
        metadata.in = 'query'
    }
});


/**
 * api Header.
 */
export interface ApiHeader {
    (option: ApiParamMetadata): ParameterDecorator;
}

export const ApiHeader: ApiHeader = createParamDecorator<ParameterObject>('ApiHeader', {
    appendProps(metadata) {
        metadata.in = 'header'
    }
});

/**
 * api body.
 */
export interface ApiBody {
    (option: {
        type: Type | string,
        isArray?: boolean;
        enum?: any[];
        description?: string;
        required?: boolean;
    }): ParameterDecorator;
}

export const ApiBody: ApiBody = createParamDecorator<ParameterObject>('ApiBody', {
    appendProps(metadata) {
        metadata.in = 'body';
    }
});



/**
 * api model decorator for swagger.
 */
export interface ApiModel {
    (summary?: string): ClassDecorator;
}

export const ApiModel: ApiModel = createDecorator('ApiModel', {

});



export interface ApiModelPropertyMetadata {
    nullable?: boolean;
    position?: number;
    required?: boolean;
    readOnly?: boolean;
    example?: string;
    examples?: any[] | Record<string, any>;
    deprecated?: boolean;
    description?: string;
    format?: string;
    default?: any;
    title?: string;
    multipleOf?: number;
    maximum?: number;
    minimum?: number;
    exclusiveMaximum?: boolean;
    exclusiveMinimum?: boolean;
    maxLength?: number;
    minLength?: number;

    value?: string;
    access?: string;
    name?: string;
    notes?: string;
    dataType?: string;
    hidden?: boolean;

    enum?: any[] | Record<string, any>;
    enumName?: string;

}
/**
 * api model decorator for swagger.
 */
export interface ApiModelProperty {
    (option: ApiModelPropertyMetadata): PropertyDecorator;
}
export const ApiModelProperty: ApiModelProperty = createDecorator('ApiModelProperty', {

});

