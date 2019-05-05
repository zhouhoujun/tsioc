import { Activity, Task, Src, Expression, Input, BodyActivity } from '@tsdi/activities';
import { PromiseUtil } from '@tsdi/ioc';
import { fromEventPattern } from 'rxjs';
import { bufferTime, filter } from 'rxjs/operators';
import { NodeActivityContext } from '../core';
const chokidar = require('chokidar');


/**
 * watch activity.
 *
 * @export
 * @class WatchActivity
 * @extends {BuildHandleActivity}
 */
@Task('watch')
export class WatchActivity extends Activity<Src> {

    @Input()
    watch: Expression<Src>;

    @Input()
    options:  Expression<any>;

    @Input()
    body: BodyActivity<any>;


    protected async execute(ctx: NodeActivityContext) {
        let watchSrc = await this.resolveExpression(this.watch, ctx);
        watchSrc = ctx.toRootSrc(watchSrc);
        let options = await this.resolveExpression(this.options, ctx);
        let watcher = chokidar.watch(watchSrc, Object.assign({ ignored: /[\/\\]\./, ignoreInitial: true }, options));

        let defer = PromiseUtil.defer();
        fromEventPattern<string[]>(
            handler => {
                watcher.on('add', paths => handler(paths));
                watcher.on('change', paths => handler(paths));
                watcher.on('unlink', paths => handler(paths));
                watcher.on('unlinkDir', paths => handler(paths));
            },
            handler => {
                watcher.close();
            })
            .pipe(
                bufferTime(300),
                filter(c => c.length > 0)
            )
            .subscribe(chg => {
                this.body.run(ctx);
            });

        defer.promise;
    }
}
