import { createDecorator, DataType } from '@tsdi/ioc';

/**
 * api Operation decorator for swagger.
 */
export interface ApiOperation {
    (summary: string, notes?: string): PropertyDecorator;
}

export const ApiOperation: ApiOperation = createDecorator('ApiOperation', {

});

/**
 * api param.
 */
export interface ApiParam {
    (option: {
        required?: boolean,
        value?: string,
        access?: string,
        allowMultiple?: boolean,
        name?: string,
        notes?: string,
        dataType?: DataType,
        hidden?: boolean,
        readonly?: boolean
        example?: string
    }): ParameterDecorator;
}

export const ApiParam = createDecorator('ApiParam', {

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
        dataType?: DataType,
        hidden?: boolean,
        readonly?: boolean,
        example?: string
    }): PropertyDecorator;
}
export const ApiModelProperty: ApiModelProperty = createDecorator('ApiModelProperty', {

});
