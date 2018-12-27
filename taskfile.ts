import { Workflow, IfActivityToken, SequenceActivityToken, ExecuteToken } from '@taskfr/core';
import { INodeActivityContext, Asset, BuildModule, AssetToken, ShellModule, TransformModule, NodeActivityContext } from '@taskfr/build';
import * as through from 'through2';
import * as path from 'path';
import { isPackClass } from '@taskfr/pack';
const inplace = require('json-in-place');


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
            ifBody: {
                sequence: [
                    {
                        src: ['packages/**/package.json', '!packages/activities/**/package.json', '!node_modules/**/package.json'],
                        pipes: [
                            ctx => versionSetting(ctx)
                        ],
                        dest: 'packages',
                        activity: AssetToken
                    },
                    {
                        src: ['package.json'],
                        pipes: [
                            ctx => versionSetting(ctx)
                        ],
                        dest: '.',
                        activity: AssetToken
                    }
                ],
                activity: SequenceActivityToken
            },
            if: ctx => ctx.getEnvArgs().setvs,
            activity: IfActivityToken
        },
        {
            execute: (ctx: INodeActivityContext) => {
                let envArgs = ctx.getEnvArgs();
                let packages = ctx.getFolders('packages').filter(f => !/activities/.test(f)); // (f => !/(annotations|aop|bootstrap)/.test(f));

                let activities = [];
                packages.forEach(fd => {
                    let objs = require(path.join(fd, 'taskfile.ts'));
                    let builder = Object.values(objs).find(v => isPackClass(v));
                    activities.push(builder);
                });
                if (envArgs.deploy) {
                    let cmd = 'npm publish --access=public'; // envArgs.deploy ? 'npm publish --access=public' : 'npm run build';
                    let cmds = packages.map(fd => {
                        return `cd ${fd} && ${cmd}`;
                    });
                    console.log(cmds);
                    activities.push({
                        shells: cmds,
                        activity: 'shell'
                    });
                }
                console.log(activities);
                return {
                    contextType: NodeActivityContext,
                    sequence: activities,
                    activity: SequenceActivityToken
                }
            },
            activity: ExecuteToken
        }
    ]
})
export class BuilderIoc {
}



let actVersionSetting = (ctx: INodeActivityContext) => {
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
            replaced.set('version', version);
            if (json.peerDependencies) {
                Object.keys(json.peerDependencies).forEach(key => {
                    if (/^@taskfr/.test(key)) {
                        replaced.set('peerDependencies.' + key, '^' + version);
                    }
                });
                Object.keys(json.dependencies).forEach(key => {
                    if (/^@taskfr/.test(key)) {
                        replaced.set('dependencies.' + key, '^' + version);
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
@Asset({
    pipes: [
        {
            if: ctx => ctx.getEnvArgs().setvs,
            ifBody: {
                src: ['packages/activities/**/package.json', '!node_modules/**/package.json'],
                pipes: [
                    (ctx) => actVersionSetting(ctx)
                ],
                dest: 'packages/activities',
                activity: AssetToken
            },
            activity: IfActivityToken
        },
        {
            shell: (ctx: INodeActivityContext) => {
                let envArgs = ctx.getEnvArgs();
                let packages = ctx.getFolders('packages/activities');
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



Workflow.create(__dirname)
    .use(BuildModule, ShellModule, TransformModule)
    .bootstrap({
        contextType: NodeActivityContext,
        if: ctx => ctx.getEnvArgs().act,
        ifBody: BuilderActivities,
        elseBody: BuilderIoc,
        activity: IfActivityToken
    });
