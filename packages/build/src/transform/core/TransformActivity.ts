import { isPromise, isToken, isMetadataObject, lang, isFunction } from '@ts-ioc/core';
import { ITransformActivity, TransformActivityToken } from './ITransformActivity';
import { ITransform } from './ITransform';
import { TransformType, TransformExpress, TransformConfig } from './transformTypes';
import { ITransformConfigure } from './ITransformConfigure';
import { Task, isWorkflowInstance, isActivityType } from '@ts-ioc/activities';
import { StreamActivity } from './StreamActivity';
import { NodeActivityContextToken } from '../../core';


/**
 * Transform activity.
 *
 * @export
 * @class BaseTask
 * @implements {ITask}
 */
@Task(TransformActivityToken)
export class TransformActivity extends StreamActivity implements ITransformActivity {

    /**
     * run task.
     *
     * @param {IActivity} [execute]
     * @returns {Promise<T>}
     * @memberof Activity
     */
    protected async execute() {
        let config = this.context.config as ITransformConfigure;
        let pipes: TransformType[];
        if (config.pipes) {
            pipes = await this.buildPipes(config.pipes);
        }
        pipes = pipes || [];
        await this.beforePipe();
        await this.pipe(...pipes);
        await this.afterPipe();
    }

    /**
     * execute pipe.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof PipeActivity
     */
    protected async pipe(...pipes: TransformType[]): Promise<void> {
        this.context.result = await this.pipeStream(this.context.result, ...pipes);
    }

    /**
     * begin pipe.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof PipeActivity
     */
    protected async beforePipe(): Promise<void> {

    }


    /**
     * end pipe.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof PipeActivity
     */
    protected async afterPipe(): Promise<void> {

    }

    /**
     * stream pipe transform.
     *
     * @protected
     * @param {ITransform} stream
     * @param {...TransformType[]} pipes
     * @returns {Promise<ITransform>}
     * @memberof PipeActivity
     */
    protected async pipeStream(stream: ITransform, ...pipes: TransformType[]): Promise<ITransform> {
        if (pipes.length < 1) {
            return stream;
        }

        if (pipes.length === 1) {
            return await this.executePipe(stream, pipes[0]);
        }

        let pstream = Promise.resolve(stream);
        pipes.forEach(transform => {
            if (transform) {
                pstream = pstream
                    .then(stm => {
                        return this.executePipe(stm, transform);
                    });
            }
        });
        return await pstream;
    }

    /**
     * translate pipes express.
     *
     * @protected
     * @param {TransformExpress} pipes
     * @returns {Promise<TransformType[]>}
     * @memberof PipeActivityBuilder
     */
    protected buildPipes(pipes: TransformExpress): Promise<TransformType[]> {
        let trsfs: TransformConfig[] = this.context.to(pipes);
        if (!trsfs || trsfs.length < 1) {
            return Promise.resolve([]);
        }
        return Promise.all(trsfs.map(p => this.translateConfig(p)));
    }
    /**
     * translate transform config.
     *
     * @protected
     * @param {TransformConfig} cfg
     * @returns {Promise<TransformType>}
     * @memberof PipeActivityBuilder
     */
    protected async translateConfig(cfg: TransformConfig): Promise<TransformType> {
        if (isWorkflowInstance(cfg)) {
            return cfg;
        } else if (isActivityType(cfg)) {
            if (!isToken(cfg)) {
                cfg.baseContextType = NodeActivityContextToken;
            }
            let inst = await this.buildActivity(cfg);
            return inst;
        } else if (isFunction(cfg)) {
            return await Promise.resolve(cfg(this.context, this));
        }

        if (isPromise(cfg)) {
            return await cfg;
        }

        lang.assertExp(isMetadataObject(cfg), 'transform configure error');
        return cfg as TransformType;
    }
}
