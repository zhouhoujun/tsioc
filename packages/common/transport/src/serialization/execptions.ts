import { NotHandleExecption } from '@tsdi/core';
import { Type, getClassName, isString } from '@tsdi/ioc';
import { SerializeContext } from './Serializer';
import { DeserializeContext } from './Deserializer';


/**
 * serialize not handle execption.
 */
export class SerializeNotHandleExecption extends NotHandleExecption {
    constructor(
        readonly target: any,
        readonly targetType: Type | string,
        readonly context: SerializeContext,
        message?: string) {
        super(target, targetType, `No serialize handler for ${isString(targetType) ? targetType : getClassName(targetType)} of${context.transport.protocol} ${message}`)
    }
}

/**
 * deserialize not handle execption.
 */
export class DeserializeNotHandleExecption extends NotHandleExecption {
    constructor(
        readonly target: any,
        readonly targetType: Type | string,
        readonly context: DeserializeContext,
        message?: string) {
        super(target, targetType, `No deserialize handler for ${isString(targetType) ? targetType : getClassName(targetType)} of ${context.transport.protocol} ${message}`)
    }
}
