import { lang } from '@tsdi/ioc';

export function invalidPipeArgumentError(type: any, value: Object) {
    return Error(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(type)}'`);
}
