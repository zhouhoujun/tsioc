import { Type } from '@tsdi/ioc';
import { stringify } from '../util/stringify';

export function invalidPipeArgumentError(type: Type<any>, value: Object) {
    return Error(`InvalidPipeArgument: '${value}' for pipe '${stringify(type)}'`);
}
