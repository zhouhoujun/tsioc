import { InjectModuleValidateToken, BaseModuelValidate, Singleton } from '@ts-ioc/core';
import { Task, Workflow } from '../decorators';

/**
 * workflow module validate token.
 */
export const WorkflowModuleValidateToken = new InjectModuleValidateToken(Workflow.toString());

/**
 * workflow module validate.
 *
 * @export
 * @class WorkflowModuleValidate
 * @extends {BaseModuelValidate}
 */
@Singleton(WorkflowModuleValidateToken)
export class WorkflowModuleValidate extends BaseModuelValidate {
    getDecorator() {
        return [Workflow.toString(), Task.toString()];
    }
}
