import { InjectModuleValidateToken, Singleton, Token } from '@ts-ioc/core';
import { Task, Workflow } from '../decorators';
import { DIModuelValidate } from '@ts-ioc/bootstrap';
import { ActivityConfigure } from '../core';

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
export class WorkflowModuleValidate extends DIModuelValidate {
    getDecorator() {
        return Task.toString();
    }

    protected getBootTokenInConfig(cfg: ActivityConfigure): Token<any> {
        return cfg.bootstrap || cfg.activity || cfg.task;
    }
}
