import { Inject, lang } from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { Around, Aspect, Joinpoint, JoinpointState } from '@tsdi/aop';
import { LogProcess } from '@tsdi/logs';
import { Task, Activity, ControlActivity, ActivityComponentRef, IActivity } from '@tsdi/activities';
import chalk from 'chalk';
const timestamp = require('time-stamp');
const prettyTime = require('pretty-hrtime');


export class TaskLogProcess extends LogProcess {

    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container);
    }

    processLog(joinPoint: Joinpoint) {
        (async () => {
            let logger = this.logger;
            let target = joinPoint.target as IActivity;
            let name = target.name;
            if (!name) {
                name = lang.getClassName(joinPoint.targetType);
            }
            let start, end;
            let taskname = '\'' + chalk.cyan(name) + '\'';
            if (joinPoint.state === JoinpointState.Before) {
                start = process.hrtime();
                target['__startAt'] = start;
                logger.log('[' + chalk.grey(timestamp('HH:mm:ss', new Date())) + ']', 'Starting', taskname, '...');
            }

            if (joinPoint.state === JoinpointState.AfterReturning) {
                start = target['__startAt'];
                end = prettyTime(process.hrtime(start));
                delete target['__startAt'];
                logger.log('[' + chalk.grey(timestamp('HH:mm:ss', new Date())) + ']', 'Finished', taskname, ' after ', chalk.magenta(end));
            }

            if (joinPoint.state === JoinpointState.AfterThrowing) {
                start = target['__startAt'];
                end = prettyTime(process.hrtime(start));
                delete target['__startAt'];
                logger.log('[' + chalk.grey(timestamp('HH:mm:ss', new Date())) + ']', 'Finished', taskname, chalk.red('errored after'), chalk.magenta(end));
                process.exit(1);
            }
        })();
    }
}

/**
 *  Custome Task Log
 *
 * @export
 * @class TaskLogAspect
 */
@Aspect({
    within: [Activity, ActivityComponentRef],
    without: ControlActivity,
    singleton: true
})
export class TaskLogAspect extends TaskLogProcess {

    @Around('execution(*.run)')
    logging(joinPoint: Joinpoint) {
        this.processLog(joinPoint);
    }
}


/**
 * control flow log
 *
 * @export
 * @class TaskControlLogAspect
 * @extends {TaskLogProcess}
 */
@Aspect({
    within: ControlActivity,
    singleton: true
})
export class TaskControlLogAspect extends TaskLogProcess {
    @Around('execution(*.run)')
    logging(joinPoint: Joinpoint) {
        this.processLog(joinPoint);
    }
}
