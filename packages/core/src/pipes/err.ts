import { isArray, lang } from '@tsdi/ioc';

/**
 * argument errror.
 */
export class ArgumentError extends Error {
    constructor(message?: string | string[]) {
        super();
        this.message = isArray(message) ? message.join('\n') : message || '';
    }
}

export function invalidPipeArgumentError(type: any, value: Object, message?: string) {
    return new ArgumentError(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(type)}'${message}`);
}

