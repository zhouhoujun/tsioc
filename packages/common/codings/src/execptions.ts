import { NotHandleExecption } from '@tsdi/core';
import { Type, getClassName, isString } from '@tsdi/ioc';
import { CodingsContext } from './context';

/**
 * codings not handle execption.
 */
export class CodingsNotHandleExecption extends NotHandleExecption {
    constructor(
        readonly target: any,
        readonly targetType: Type | string,
        readonly codingType: 'encodings' | 'decodings',
        readonly codingsContext: CodingsContext,
        message: string) {
        super(target, targetType,`No ${codingType} handler for ${isString(targetType) ? targetType : getClassName(targetType)} of ${message}`)
    }
}
