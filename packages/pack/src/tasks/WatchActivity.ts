import { PromiseUtil } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { Task, Src, BodyTemplate, ActivityType } from '@tsdi/activities';
import { fromEventPattern } from 'rxjs';
import { bufferTime, filter } from 'rxjs/operators';
import { NodeActivityContext } from '../NodeActivityContext';
import { NodeActivity } from '../NodeActivity';
const chokidar = require('chokidar');


export interface WatchActivityOption extends BodyTemplate {
    /**
     * watch source.
     *
     * @type {Src}
     * @memberof UnitTestActivityOption
     */
    watch: Binding<Src>;

    /**
     * src option
     *
     * @type {*}
     * @memberof UnitTestActivityOption
     */
    watchOptions?: Binding<any>;
}


/**
 * watch activity.
 *
 * @export
 * @class WatchActivity
 * @extends {BuildHandleActivity}
 */
@Task('watch')
export class WatchActivity extends NodeActivity<void> {

    @Input()
    watch: Src;

    @Input('watchOptions')
    options:  any;

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;



    async execute(ctx: NodeActivityContext) {
        let watchSrc = this.watch;
        let options = this.options;
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
