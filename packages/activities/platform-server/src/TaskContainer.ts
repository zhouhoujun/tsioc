import { ITaskContainer, TaskContainer, Active, IActivityRunner } from '@taskfr/core';
import { LoadType } from '@ts-ioc/core';
import { TaskLogAspect, RunnerLogAspect } from './aop';
import { ApplicationBuilder } from '@ts-ioc/bootstrap';
import { IApplicationBuilder } from '@ts-ioc/bootstrap';
import { ServerModule } from '@ts-ioc/platform-server';
import * as path from 'path';
import chalk from 'chalk';
const timestamp = require('time-stamp');

const processRoot = path.join(path.dirname(process.cwd()), path.basename(process.cwd()));
/**
 * task container in server.
 *
 * @export
 * @class TaskContainer
 * @extends {TaskContainer}
 */
export class ServerTaskContainer extends TaskContainer implements ITaskContainer {

    constructor(baseURL?: string) {
        super(baseURL);
        this.use(ServerModule)
            .use(TaskLogAspect)
            .use(RunnerLogAspect);
    }

    protected createAppBuilder(): IApplicationBuilder<any> {
        return new ApplicationBuilder(this.baseURL || processRoot);
    }

    /**
     * create task container.
     *
     * @static
     * @param {string} root
     * @param {...(Type<any> | AsyncLoadOptions)[]} modules
     * @returns {ITaskContainer}
     * @memberof TaskContainer
     */
    static create(root?: string, ...modules: LoadType[]) {
        let taskContainer = new TaskContainer(root);
        if (modules) {
            taskContainer.use(...modules);
        }
        return taskContainer;
    }

    async createActivity(activity: Active, workflowId?: string): Promise<IActivityRunner<any>> {
        console.log('[' + chalk.grey(timestamp('HH:mm:ss', new Date())) + ']', 'Loading  workflow ', workflowId || '', '...');
        return await super.createActivity(activity, workflowId);
    }

}
