
import { IActivity, Task, InjectTranslatorToken } from '@ts-ioc/activities';
import { PromiseUtil, isArray, Token, lang } from '@ts-ioc/core';
import { fromEventPattern } from 'rxjs';
import { bufferTime, flatMap, filter } from 'rxjs/operators';
import { BuildHandleActivity, BuildHandleContext } from '../BuildHandleActivity';
import { FileChanged, FileChangedTransToken, IFileChanged } from '../FileChanged';
import { WatchAcitvityToken, WatchConfigure, IWatchActivity } from './IWatchActivity';
const chokidar = require('chokidar');


/**
 * watch activity.
 *
 * @export
 * @class WatchActivity
 * @extends {BuildHandleActivity}
 */
@Task(WatchAcitvityToken)
export class WatchActivity extends BuildHandleActivity implements IWatchActivity {

    /**
     * watch body.
     *
     * @type {IActivity}
     * @memberof WatchActivity
     */
    body?: IActivity;

    /**
     * default translator token.
     *
     * @type {Token<any>}
     * @memberof WatchActivity
     */
    defaultTranslatorToken: Token<any>;

    protected async compile(ctx: BuildHandleContext<any>): Promise<void> {
        await this.watch(ctx);
    }

    async onActivityInit(config: WatchConfigure) {
        await super.onActivityInit(config);
        if (config.body) {
            this.body = await this.buildActivity(config.body);
        }
    }

    protected async watch(ctx: BuildHandleContext<any>) {
        let config = ctx.config as WatchConfigure;
        let watchSrc = await this.resolveExpression(config.src, ctx);
        watchSrc = ctx.toRootSrc(watchSrc);
        let options = await this.resolveExpression(config.options, ctx);
        let watcher = chokidar.watch(watchSrc, lang.assign({ ignored: /[\/\\]\./, ignoreInitial: true }, options));
        let watchBody = this.body || ctx.target;

        let defer = PromiseUtil.defer();
        fromEventPattern<IFileChanged>(
            handler => {
                watcher.on('add', paths => handler({ added: isArray(paths) ? paths : [paths] }));
                watcher.on('change', paths => handler({ updated: isArray(paths) ? paths : [paths] }));
                watcher.on('unlink', paths => handler({ removed: isArray(paths) ? paths : [paths] }));
                watcher.on('unlinkDir', paths => handler({ removed: isArray(paths) ? paths : [paths] }));
            },
            handler => {
                watcher.close();
            })
            .pipe(
                bufferTime(300),
                filter(c => c.length > 0),
                flatMap(chgs => {
                    let chg = new FileChanged(watchSrc);
                    chgs.forEach(fc => {
                        if (fc.added) {
                            chg.added = chg.added.concat(fc.added);
                        }
                        if (fc.updated) {
                            chg.updated = chg.updated.concat(fc.updated);
                        }
                        if (fc.removed) {
                            chg.removed = chg.removed.concat(fc.removed);
                        }
                    });
                    return this.container.getService(
                        FileChangedTransToken,
                        lang.getClass(this),
                        tk => new InjectTranslatorToken<FileChanged, Promise<string[]>>(tk))
                        .translate(chg);
                })
            )
            .subscribe(chg => {
                ctx.setAsResult(chg);
                this.execActivity(watchBody, ctx);
            });

        defer.promise;
    }
}
