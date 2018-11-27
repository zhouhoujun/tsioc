import { Task } from '@taskfr/core';
import { ITransform } from './ITransform';
import { isUndefined } from '@ts-ioc/core';
import { TransformType, isTransform } from './transformTypes';
import { InputDataToken, InjectActivityContextToken } from '@taskfr/core';
import { Injectable, Inject, isArray, isString } from '@ts-ioc/core';
import { ISourceMapsActivity } from './SourceMapsActivity';
import { src } from 'vinyl-fs';
import { Stream } from 'stream';
import { CompilerActivity, BuildHandleContext } from '../../core';

@Task
export class StreamActivity extends CompilerActivity {

    protected async execute(): Promise<void> {

    }

    getContext(): TransformContext {
        return super.getContext() as TransformContext;
    }

    /**
     * create activity context.
     *
     * @protected
     * @memberof PipeActivity
     */
    protected verifyCtx(ctx?: any) {
        if (ctx instanceof TransformContext) {
            this._ctx = ctx;
        } else {
            let cur = this.getContext();
            if (ctx instanceof BuildHandleContext) {
                cur.builder = ctx.builder;
                cur.origin = ctx.origin;
            }
            cur.setAsResult(ctx);
        }
    }

    /**
    * execute stream pipe.
    *
    * @protected
    * @param {ITransform} stream stream pipe from
    * @param {TransformType} transform steam pipe to.
    * @param {boolean} [waitend=false] wait pipe end or not.
    * @returns {Promise<ITransform>}
    * @memberof TransformActivity
    */
    protected async executePipe(stream: ITransform, transform: TransformType, waitend = false): Promise<ITransform> {
        let next: ITransform;
        let transPipe = await this.getContext().exec(this, transform);
        let vaild = false;
        if (isTransform(stream)) {
            if (isTransform(transPipe) && !transPipe.changeAsOrigin) {
                vaild = true;
            } else {
                next = stream;
            }
        } else if (isTransform(transPipe) && transPipe.changeAsOrigin) {
            next = transPipe;
        }

        if (vaild) {
            next = stream.pipe(transPipe);
            if (waitend) {
                return await new Promise((r, j) => {
                    next
                        .once('end', r)
                        .once('error', j);
                }).then(() => {
                    next.removeAllListeners('error');
                    next.removeAllListeners('end');
                    return next;
                }, err => {
                    next.removeAllListeners('error');
                    next.removeAllListeners('end');
                    if (!isUndefined(process)) {
                        process.exit(1);
                        return err;
                    } else {
                        return Promise.reject(new Error(err));
                    }
                });
            }
        }
        return next;

    }

}

/**
 *  transform context token.
 */
export const TransformContextToken = new InjectActivityContextToken(StreamActivity);

/**
 * Transform activity context.
 *
 * @export
 * @class TransformActivityContext
 * @extends {ActivityContext}
 * @implements {IActivityContext<ITransform>}
 */
@Injectable(TransformContextToken)
export class TransformContext extends BuildHandleContext<ITransform> {

    sourceMaps: ISourceMapsActivity;

    constructor(@Inject(InputDataToken) input: any) {
        super(input);
    }

    protected translate(input: any): any {
        input = super.translate(input);
        if (input instanceof Stream) {
            return input;
        } else if (isArray(input)) {
            return src(input.filter(i => isString(i) || isArray(i)));
        } else if (isString(input)) {
            return src(input);
        }
        return input;
    }
}
