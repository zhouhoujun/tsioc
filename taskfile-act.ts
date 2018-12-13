import { TaskContainer } from '@taskfr/core';
import { Asset, AssetActivity, BuildModule, INodeActivityContext } from '@taskfr/build';
import * as through from 'through2';
const inplace = require('json-in-place')



let versionSetting = (ctx: INodeActivityContext) => {
    let envArgs = ctx.getEnvArgs();
    return through.obj(function (file, encoding, callback) {
        if (file.isNull()) {
            return callback(null, file);
        }

        if (file.isStream()) {
            return callback('doesn\'t support Streams');
        }

        let contents: string = file.contents.toString('utf8');
        let json = JSON.parse(contents);
        let replaced = inplace(contents);
        let version = envArgs['setvs'] || '';
        if (version) {
            let replaced = inplace(contents)
                .set('version', version);
            if (json.peerDependencies) {
                Object.keys(json.peerDependencies).forEach(key => {
                    if (/^@taskfr/.test(key)) {
                        replaced.set('peerDependencies.' + key, '^' + version);
                    }
                });
            }
        }
        if (json.dependencies) {
            let iocVersion = '^' + ctx.getPackage().version;
            Object.keys(json.dependencies).forEach(key => {
                if (/^@ts-ioc/.test(key)) {
                    replaced.set('dependencies.' + key, iocVersion)
                }
            })
        }
        file.contents = new Buffer(replaced.toString());
        this.push(file);
        callback();
    })
}

let iocVersion = (ctx: INodeActivityContext) => {
    return through.obj(function (file, encoding, callback) {
        if (file.isNull()) {
            return callback(null, file);
        }

        if (file.isStream()) {
            return callback('doesn\'t support Streams');
        }

        let contents: string = file.contents.toString('utf8');
        let version = ctx.getPackage().version;
        let json = JSON.parse(contents);
        if (json.dependencies) {
            let replaced = inplace(contents);
            Object.keys(json.dependencies).forEach(key => {
                if (/^@ts-ioc/.test(key)) {
                    replaced.set('dependencies.' + key, version)
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
                (act: AssetActivity) => versionSetting(act.context),
                (act: AssetActivity) => iocVersion(act.context)
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
