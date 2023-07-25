import { createDecorator, createParamDecorator } from '@tsdi/ioc';

/**
 * api Operation decorator for swagger.
 */
export interface ApiOperation {
    (summary: string, notes?: string): PropertyDecorator;
}

export const ApiOperation: ApiOperation = createDecorator('ApiOperation', {

});

export interface ApiParamMetadata {
    required?: boolean,
    value?: string,
    access?: string,
    allowMultiple?: boolean,
    name?: string,
    notes?: string,
    dataType?: string,
    hidden?: boolean,
    readonly?: boolean
    example?: string
}

/**
 * api param.
 */
export interface ApiParam {
    (option: ApiParamMetadata): ParameterDecorator;
}

export const ApiParam: ApiParam = createParamDecorator('ApiParam', {

});

/**
 * api model decorator for swagger.
 */
export interface ApiModel {
    (summary?: string): ClassDecorator;
}

export const ApiModel: ApiModel = createDecorator('ApiModel', {

});

/**
 * api model decorator for swagger.
 */
export interface ApiModelProperty {
    (option: {
        position?: number,
        required?: boolean,
        value?: string,
        access?: string,
        name?: string,
        notes?: string,
        dataType?: string,
        hidden?: boolean,
        readonly?: boolean,
        example?: string
    }): PropertyDecorator;
}
export const ApiModelProperty: ApiModelProperty = createDecorator('ApiModelProperty', {

});
