
import { IActivity, Src, Expression, Task, InjectTranslatorToken } from '@taskfr/core';
import { Defer, isArray, Token, lang } from '@ts-ioc/core';
import { fromEventPattern } from 'rxjs';
import { bufferTime, flatMap, filter } from 'rxjs/operators';
import { BuildHandleActivity, BuildHandleContext } from '../BuildHandleActivity';
import { FileChanged, FileChangedTransToken, IFileChanged } from '../FileChanged';
import { WatchAcitvityToken, WatchOptions, WatchConfigure, IWatchActivity } from './IWatchActivity';
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
     * watch src.
     *
     * @type {Expression<Src>}
     * @memberof WatchActivity
     */
    src: Expression<Src>;

    /**
     * watch body.
     *
     * @type {IActivity}
     * @memberof WatchActivity
     */
    body?: IActivity;
    /**
     * watch options.
     *
     * @type {Expression<WatchOptions>}
     * @memberof WatchActivity
     */
    options: Expression<WatchOptions>;

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
        this.src = await this.toExpression(config.src);
        if (config.body) {
            this.body = await this.buildActivity(config.body);
        }
        if (config.options) {
            this.options = await this.toExpression(config.options)
        }
    }

    protected async watch(ctx: BuildHandleContext<any>) {
        let watchSrc = await ctx.exec(this, this.src);
        let options = await ctx.exec(this, this.options);
        let watcher = chokidar.watch(watchSrc, lang.assign({ ignored: /[\/\\]\./, ignoreInitial: true }, options));
        let watchBody = this.body || ctx.builder || ctx.target;

        let defer = new Defer();
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
