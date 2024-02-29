import { Inject, isString, Token, tokenId, ClassType } from '@tsdi/ioc';
import { invalidPipeArgument, Pipe, PipeTransform } from '@tsdi/core';

/**
 * ObjectID token for objectId pipe {@link ParseObjectIdPipe}
 */
export const ObjectIDToken: Token<ClassType> = tokenId<ClassType>('ObjectID');

@Pipe('objectId')
export class ParseObjectIdPipe implements PipeTransform {

    constructor(@Inject(ObjectIDToken) private type: ClassType) { }

    transform(value: any) {
        if(!this.type) {
            throw invalidPipeArgument(this, value, 'can not found module type ObjectID.')
        }
        if (isString(value)) {
            return new this.type(value)
        } else if (value instanceof this.type) {
            return value
        }
        throw invalidPipeArgument(this, value)
    }

}