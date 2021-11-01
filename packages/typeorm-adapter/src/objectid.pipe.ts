import { Inject, isString, Token, tokenId, Type } from '@tsdi/ioc';
import { invalidPipeArgumentError, Pipe, PipeTransform } from '@tsdi/core';

/**
 * ObjectID token for objectId pipe {@link ParseObjectIdPipe}
 */
export const ObjectIDToken: Token<Type> = tokenId<Type>('ObjectID');

@Pipe('objectId')
export class ParseObjectIdPipe implements PipeTransform {

    constructor(@Inject(ObjectIDToken) private type: Type) { }

    transform(value: any) {
        if(!this.type) {
            throw invalidPipeArgumentError(this, value, 'can not found module type ObjectID.')
        }
        if (isString(value)) {
            return new this.type(value);
        } else if (value instanceof this.type) {
            return value;
        }
        throw invalidPipeArgumentError(this, value);
    }

}