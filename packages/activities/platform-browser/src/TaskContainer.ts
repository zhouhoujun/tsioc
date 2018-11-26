import { ITaskContainer, DefaultTaskContainer } from '@taskfr/core';
import { LoadType } from '@ts-ioc/core';
import { TaskLogAspect, RunnerLogAspect } from './aop/index';
import { ApplicationBuilder } from '@ts-ioc/platform-browser/bootstrap';
import { IApplicationBuilder } from '@ts-ioc/bootstrap';

/**
 * task container in browser.
 *
 * @export
 * @class TaskContainer
 * @extends {DefaultTaskContainer}
 */
export class TaskContainer extends DefaultTaskContainer implements ITaskContainer {

    constructor(baseURL: string) {
        super(baseURL);
        this.use(TaskLogAspect)
            .use(RunnerLogAspect);
    }

    protected createAppBuilder(): IApplicationBuilder<any>  {
        return new ApplicationBuilder(this.baseURL);
    }

    /**
     * create task container.
     *
     * @static
     * @param {string} root
     * @param {...ModuleType[]} modules
     * @returns {ITaskContainer}
     * @memberof TaskContainer
     */
    static create(root: string, ...modules: LoadType[]) {
        let taskContainer = new TaskContainer(root);
        if (modules) {
            taskContainer.use(...modules);
        }
        return taskContainer;
    }

}
