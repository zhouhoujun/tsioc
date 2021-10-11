import { invalidPipeArgumentError } from '@tsdi/core';
import { isString, isUndefined } from '@tsdi/ioc';
import { Pipe } from '../../metadata/decor';
import { PipeTransform } from '../pipe';

@Pipe('parse-enum')
export class ParseEnumPipe<T> implements PipeTransform<T> {

    transform(value: any, enumType: T): T {
        if (!enumType || Object.keys(enumType).length < 1) {
            throw invalidPipeArgumentError(this, enumType, 'enumType is right Enum type.');
        }
        const keys = Object.keys(enumType);
        if (isString(value)) {
            if (keys.indexOf(value) < 0) {
                throw invalidPipeArgumentError(this, value, `, enmu of ${enumType}`);
            }
            return (enumType as any)[value] as T;
        } else {
            let key = keys.find(k => (enumType as any)[k] === value);
            if (isUndefined(key)) {
                throw invalidPipeArgumentError(this, value, `, enmu of ${enumType}`);
            }
            return (enumType as any)[key] as T;
        }

    }

}
