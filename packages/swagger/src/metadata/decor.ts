import { createDecorator } from '@tsdi/ioc';

/**
 * api Operation decorator for swagger.
 */
export interface ApiOperation {
    (summary: string, notes?: string): PropertyDecorator;
}

export const ApiOperation: ApiOperation = createDecorator('ApiOperation', {

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
    (position: number, summary?: string): PropertyDecorator;
}
export const ApiModelProperty: ApiModelProperty = createDecorator('ApiModelProperty', {

});
