import { TaskContainer } from '@taskfr/core';
import { INodeActivityContext, Asset, BuildModule, AssetActivity, ShellModule, TransformModule } from '@taskfr/build';
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
        let version = envArgs['setvs'] || '';
        if (version) {
            let json = JSON.parse(contents);
            let replaced = inplace(contents)
                .set('version', version);
            if (json.peerDependencies) {
                Object.keys(json.peerDependencies).forEach(key => {
                    if (/^@ts-ioc/.test(key)) {
                        replaced.set('peerDependencies.' + key, '^' + version);
                    }
                });
                Object.keys(json.dependencies).forEach(key => {
                    if (/^@ts-ioc/.test(key)) {
                        replaced.set('dependencies.' + key, '^' + version);
                    }
                });
            }
            contents = replaced.toString();
        }
        file.contents = new Buffer(contents);
        this.push(file);
        callback();
    })
}

@Asset({
    pipes: [
        {
            src: ['packages/**/package.json', '!packages/activities/**/package.json', '!node_modules/**/package.json'],
            pipes: [
                (act: AssetActivity) => versionSetting(act.context)
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
                let packages = ctx.getFolders('packages').filter(f => !/activities/.test(f)); // (f => !/(annotations|aop|bootstrap)/.test(f));
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
export class BuilderIoc {
}

TaskContainer.create(__dirname)
    .use(BuildModule, ShellModule, TransformModule)
    .bootstrap(BuilderIoc);
