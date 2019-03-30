import { IContainer, ContainerToken } from '@tsdi/core';
import { Around, Aspect, Joinpoint, JoinpointState } from '@tsdi/aop';
import { LoggerAspect } from '@tsdi/logs';
import chalk from 'chalk';
import { Task } from '@tsdi/activities';
import { ObjectMap, Inject, lang } from '@tsdi/ioc';
const timestamp = require('time-stamp');
const prettyTime = require('pretty-hrtime');

/**
 * Task Log
 *
 * @export
 * @class TaskLogAspect
 */
@Aspect({
    annotation: Task,
    singleton: true
})
export class TaskLogAspect extends LoggerAspect {

    private startHrts: ObjectMap<any>;
    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container);
        this.startHrts = {};
    }

    @Around('execution(*.run)')
    logging(joinPoint: Joinpoint) {
        let logger = this.logger;
        let target = joinPoint.target;
        let name = target.name;
        if (!name) {
            let classAnnations = lang.getClassAnnations(joinPoint.targetType);
            name = classAnnations ? classAnnations.name : joinPoint.targetType.name;
        }
        let start, end;
        let taskname = '\'' + chalk.cyan(name) + '\'';
        if (joinPoint.state === JoinpointState.Before) {
            if (target.context && target.context.config && target.context.config.title) {
                logger.log('\n' + chalk.grey(target.context.config.title + ' ' + name + '\n'));
            }
            start = process.hrtime();
            this.startHrts[name] = start;
            logger.log('[' + chalk.grey(timestamp('HH:mm:ss', new Date())) + ']', 'Starting', taskname, '...');
        }

        if (joinPoint.state === JoinpointState.AfterReturning) {
            start = this.startHrts[name];
            end = prettyTime(process.hrtime(start));
            delete this.startHrts[name];
            logger.log('[' + chalk.grey(timestamp('HH:mm:ss', new Date())) + ']', 'Finished', taskname, ' after ', chalk.magenta(end));
        }

        if (joinPoint.state === JoinpointState.AfterThrowing) {
            start = this.startHrts[name];
            end = prettyTime(process.hrtime(start));
            delete this.startHrts[name];
            logger.log('[' + chalk.grey(timestamp('HH:mm:ss', new Date())) + ']', 'Finished', taskname, chalk.red('errored after'), chalk.magenta(end));
            process.exit(1);
        }
    }
}
