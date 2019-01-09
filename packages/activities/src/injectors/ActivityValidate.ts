import { ModuelValidate, InjectModuleValidateToken, Singleton } from '@ts-ioc/core';
import { Task } from '../decorators/Task';

/**
 * activity vaildate token
 */
export const ActivityValidateToken = new InjectModuleValidateToken(Task.toString());

/**
 * activity validate.
 *
 * @export
 * @class ActivityValidate
 * @extends {ModuelValidate}
 */
@Singleton(ActivityValidateToken)
export class ActivityValidate extends ModuelValidate {
    getDecorator(): string {
        return Task.toString();
    }
}
