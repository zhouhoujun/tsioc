import {
    BuildActivity, CleanActivity, TestActivity,
    AssetConfigure, BuildHandleActivity, Asset, StreamAssetConfigure,
    InjectAssetToken, AssetToken, BuildHandleToken,
    CleanConfigure, CleanToken, TestConfigure, TestToken, IAssetBuildHandle
} from '@ts-ioc/build';
import { IPackActivity, PackToken } from './IPackActivity';
import { ServeActivity } from '../serves';
import { PackConfigure } from './PackConfigure';
import { lang, hasClassMetadata, isString, isArray } from '@ts-ioc/ioc';
import {
    Src, SequenceActivity, ParallelActivity, SequenceConfigure,
    SequenceActivityToken, ParallelConfigure, ParallelActivityToken
} from '@ts-ioc/activities';
import { Pack } from '../decorators/Pack';


@Pack(PackToken)
export class PackActivity extends BuildActivity implements IPackActivity {
    /**
     * clean activity.
     *
     * @type {CleanActivity}
     * @memberof PackActivity
     */
    clean: CleanActivity;

    /**
     * test activity.
     *
     * @type {TestActivity}
     * @memberof PackActivity
     */
    test: TestActivity;
    /**
     * serve activity.
     *
     * @type {ServeActivity}
     * @memberof IPackActivity
     */
    serve: ServeActivity;

    /**
     * execute once action.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof PackActivity
     */
    protected async execOnce(): Promise<void> {
        await this.execActivity(this.clean, this.context);
        await super.execOnce();
    }

    protected async beforeBuild() {
        await this.execActivity(this.test, this.context);
        await super.beforeBuild();
    }

    protected async afterBuild() {
        await super.afterBuild();
        await this.execActivity(this.serve, this.context);
    }

    async onActivityInit(config: PackConfigure) {
        await super.onActivityInit(config);
        let srcRoot = this.src = this.context.to(config.src);
        let assets = await Promise.all(Object.keys(config.assets).map(name => {
            return this.toActivity<Src, IAssetBuildHandle, AssetConfigure>(config.assets[name],
                (act: any) => {
                    let flag = act instanceof BuildHandleActivity
                        || act instanceof SequenceActivity
                        || act instanceof ParallelActivity
                    if (flag) {
                        return true;
                    } else if (act) {
                        return hasClassMetadata(Asset, lang.getClass(act));
                    }
                    return false;
                },
                src => {
                    if (isString(src) || isArray(src)) {
                        return <AssetConfigure>{ src: src };
                    } else {
                        return null;
                    }
                },
                cfg => {
                    if (!cfg) {
                        return null;
                    }
                    let seqcfg = cfg as SequenceConfigure;
                    if (isArray(seqcfg.sequence)) {
                        if (!seqcfg.activity && !seqcfg.task) {
                            seqcfg.task = SequenceActivityToken;
                        }
                        return seqcfg;
                    }

                    let parcfg = cfg as ParallelConfigure;
                    if (isArray(parcfg.parallel)) {
                        if (!parcfg.activity && !parcfg.task) {
                            parcfg.task = ParallelActivityToken;
                        }
                        return parcfg;
                    }

                    let assCfg = cfg as StreamAssetConfigure;
                    if (!assCfg.activity && !assCfg.task) {
                        assCfg.task = new InjectAssetToken(name);
                    }

                    if (isString(assCfg.task)) {
                        assCfg.task = new InjectAssetToken(assCfg.task);
                    }
                    if (!this.container.has(assCfg.task)) {
                        assCfg.task = AssetToken;
                    }

                    if (srcRoot && !assCfg.src) {
                        assCfg.src = `${srcRoot}/**/*.${name}`;
                    }
                    return assCfg;
                })
                .then(a => {
                    if (!a) {
                        return null;
                    }
                    if (!(a instanceof BuildHandleActivity)) {
                        let handle = this.container.resolve(BuildHandleToken);

                        handle.compiler = a;
                        handle.name = 'handle-' + name;
                        return handle;
                    }
                    return a;
                })
        }));

        this.use(...assets.filter(a => a));

        if (config.clean) {
            this.clean = await this.toActivity<Src, CleanActivity, CleanConfigure>(config.clean,
                act => act instanceof CleanActivity,
                src => {
                    return <CleanConfigure>{ clean: src, activity: CleanToken, baseURL: config.baseURL };
                }
            );
        }

        if (config.test) {
            this.test = await this.toActivity<Src, TestActivity, TestConfigure>(config.test,
                act => act instanceof TestActivity,
                src => {
                    if (!src) {
                        return null;
                    }
                    return <TestConfigure>{ src: src, activity: TestToken, baseURL: config.baseURL };
                }
            );
        }
    }
}
