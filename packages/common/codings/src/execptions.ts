import { NotHandleExecption } from '@tsdi/core';
import { Type, getClassName, isString } from '@tsdi/ioc';
import { CodingType, CodingsContext } from './context';

/**
 * 
 */
export class CodingsNotHandleExecption extends NotHandleExecption {
    constructor(
        readonly target: any,
        readonly targetType: Type | string,
        readonly codingType: CodingType,
        readonly codingsContext: CodingsContext,
        message: string) {
        super(target, targetType,`No ${codingType == CodingType.Encode ? 'encodings' : 'decodings'} handler for ${isString(targetType) ? targetType : getClassName(targetType)} of ${message}`)
    }
}
