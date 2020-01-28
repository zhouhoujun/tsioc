import { PromiseUtil } from '@tsdi/ioc';
import { Input, Binding, BindingTypes } from '@tsdi/components';
import { Activity, Task, Src, BodyTemplate, ActivityType } from '@tsdi/activities';
import { fromEventPattern } from 'rxjs';
import { bufferTime, filter } from 'rxjs/operators';
import { NodeActivityContext, NodeExpression } from '../NodeActivityContext';
const chokidar = require('chokidar');


export interface WatchActivityOption extends BodyTemplate {
    /**
     * watch source.
     *
     * @type {NodeExpression<Src>}
     * @memberof UnitTestActivityOption
     */
    watch: Binding<NodeExpression<Src>>;

    /**
     * src option
     *
     * @type {NodeExpression<DestOptions>}
     * @memberof UnitTestActivityOption
     */
    watchOptions?: Binding<NodeExpression>;
}


/**
 * watch activity.
 *
 * @export
 * @class WatchActivity
 * @extends {BuildHandleActivity}
 */
@Task('watch')
export class WatchActivity extends Activity<void> {

    @Input()
    watch: NodeExpression<Src>;

    @Input('watchOptions')
    options:  NodeExpression;

    @Input({ bindingType: BindingTypes.dynamic }) body: ActivityType<any>;



    async execute(ctx: NodeActivityContext) {
        let watchSrc = await ctx.resolveExpression(this.watch);
        let options = await ctx.resolveExpression(this.options);
        let watcher = chokidar.watch(ctx.platform.normalizeSrc(watchSrc), Object.assign({ ignored: /[\/\\]\./, ignoreInitial: true, cwd: ctx.platform.getRootPath() }, options));

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
                ctx.getExector().runActivity(this.body);
            });

        defer.promise;
    }
}
