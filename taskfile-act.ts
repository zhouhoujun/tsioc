import { TaskContainer } from '@taskfr/platform-server';
import { INodeActivityContext } from '@taskfr/node';
import { Asset, AssetActivity, BuildModule } from '@taskfr/build';
const jeditor = require('gulp-json-editor');



let versionSetting = (ctx: INodeActivityContext) => {
    let envArgs = ctx.getEnvArgs();
    return jeditor((json: any) => {
        let version = envArgs['setvs'] || '';
        if (version) {
            json.version = version;
            if (json.peerDependencies) {
                Object.keys(json.peerDependencies).forEach(key => {
                    if (/^@taskfr/.test(key)) {
                        json.peerDependencies[key] = '^' + version;
                    }
                })
            }
        }
        return json;
    })
}

let iocVersion = (ctx: INodeActivityContext) => {
    return jeditor((json: any) => {
        let version = ctx.getPackage().devDependencies['@ts-ioc/core'];
        if (json.dependencies) {
            Object.keys(json.dependencies).forEach(key => {
                if (/^@ts-ioc/.test(key)) {
                    json.dependencies[key] = version;
                }
            })
        }
        return json;
    })
}

@Asset({
    pipes: [
        {
            src: ['packages/**/package.json', '!node_modules/**/package.json'],
            pipes: [
                (act: AssetActivity) => versionSetting(act.getContext()),
                (act: AssetActivity) => iocVersion(act.getContext())
            ],
            dest: 'packages',
            activity: AssetActivity
        },
        {
            src: ['package.json'],
            pipes: [
                (act: AssetActivity) => versionSetting(act.getContext())
            ],
            dest: '.',
            activity: AssetActivity
        },
        {
            shell: (ctx: INodeActivityContext) => {
                let envArgs = ctx.getEnvArgs();
                let packages = ctx.getFolders('packages/activites');
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
export class BuilderActivities {
}

TaskContainer.create(__dirname)
    .use(BuildModule)
    .bootstrap(BuilderActivities);
