import { AbstractType, isBasicType, isNumber, isPrimitive, isString, Type } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { PipeTransform, invalidPipeArgument } from '../pipe';
import e = require('express');

const arrJson = /^\[.*\]$/;
/**
 * parse long.
 */
@Pipe('array')
export class ArrayPipe implements PipeTransform<Array<any>> {

    transform<T>(value: any, type?: AbstractType<T> | 'string' | 'int' | 'float' | 'number' | 'bigint', length?: number): Array<T> {
        let ret: Array<T>;
        if (isString(value)) {
            if (arrJson.test(value)) {
                ret = JSON.parse(value) as Array<T>;
            } else {
                const str = value.split(',');
                if (type) {
                    ret = str.map(s => this.parseType(s, type));
                } else {
                    ret = str as Array<T>;
                }
            }
        } else {
            ret = value as Array<T>;
        }
        if (length && ret?.length !== length) {
            throw invalidPipeArgument(this, value, `array length must be ${length}`);
        }
        return ret
    }

    private parseType(value: any, type: AbstractType | 'string' | 'int' | 'float' | 'number' | 'bigint'): any {
        switch (type) {
            case 'int':
                return parseInt(value);
            case 'float':
                return parseFloat(value);
            case Number:
            case 'number':
                return Number(value);

            case BigInt:
            case 'bigint':
                return BigInt(value);
            case 'string':
                return value;
            default:
                if (type) {
                    if (isBasicType(type)) {
                        return type(value);
                    } else {
                        return new (type as Type)(value);
                    }
                }
        }
        // if (type === 'string') {
        //     return value as T;
        // } else if (type === 'int') {
        //     return parseInt(value) as T;
        // } else if (type === 'float') {
        //     return parseFloat(value) as T;
        // } else if (type === 'number') {
        //     return Number(value) as T;
        // } else if (type === 'bigint') {
        //     return BigInt(value) as T;
        // } else if (type) {
        //     return new type(value) as T;
        // } else {
        //     return value as T;
        // }
    }


}

