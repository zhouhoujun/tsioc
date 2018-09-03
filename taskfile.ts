import { PipeModule, IPipeContext, PipeTask, AssetActivity } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';
const jeditor = require('gulp-json-editor');



let versionSetting = (ctx: IPipeContext) => {
    let envArgs = ctx.getEnvArgs();
    return jeditor((json: any) => {
        let version = envArgs['vs'] || '';
        if (version) {
            json.version = version;
            if (json.peerDependencies) {
                Object.keys(json.peerDependencies).forEach(key => {
                    if (/^@ts-ioc/.test(key)) {
                        json.peerDependencies[key] = '^' + version;
                    }
                })
            }
        }
        return json;
    })
}

@PipeTask({
    pipes: [
        {
            src: ['packages/**/package.json', '!node_modules/**/package.json'],
            pipes: [
                (act: AssetActivity) => versionSetting(act.context),
            ],
            dest: 'packages',
            activity: AssetActivity
        },
        {
            src: ['package.json'],
            pipes: [
                (act: AssetActivity) => versionSetting(act.context)
            ],
            dest: '.',
            activity: AssetActivity
        },
        {
            shell: (ctx: IPipeContext) => {
                let envArgs = ctx.getEnvArgs();
                let packages = ctx.getFolders('packages');
                let cmd = envArgs.deploy ? 'npm publish --access=public' : 'npm run build';
                let cmds = packages.map(fd => {
                    return `cd ${fd} && ${cmd}`;
                });
                console.log(cmds);
                return cmds;
            },
            activity: 'shell'
        }
    ]
})
export class BuilderPackage {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(BuilderPackage);
