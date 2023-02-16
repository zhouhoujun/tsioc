import { Type, isString, lang } from '@tsdi/ioc';
import { Workflow, Task, Activities, isAcitvityClass, Activity } from '@tsdi/activities';
import * as path from 'path';
import { PackModule, NodeActivityContext, JsonReplaceActivityOption } from '@tsdi/pack';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';
import * as through from 'through2';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: [
        {
            activity: 'if',
            condition: (ctx: NodeActivityContext) => {
                let unp = ctx.platform.getEnvArgs().unp;
                return isString(unp) && /\d+.\d+.\d+/.test(unp);
            },
            body: {
                activity: 'shell',
                shell: (ctx: NodeActivityContext) => {
                    let packages = ctx.platform.getFolders('packages');
                    let version = ctx.platform.getEnvArgs().unp;
                    let cmds = [];
                    packages.forEach(fd => {
                        let objs = require(path.join(fd, 'package.json'));
                        if (objs && objs.name) {
                            cmds.push(`npm unpublish ${objs.name}@${version}`)
                        }
                    });
                    console.log(cmds);
                    return cmds;
                }
            }
        },
        {
            activity: 'elseif',
            condition: (ctx: NodeActivityContext) => ctx.platform.getEnvArgs().build !== 'false',
            body: [
                {
                    activity: 'if',
                    // condition: {
                    //     activity: 'exists',
                    //     expect: `ctx.platform.getEnvArgs().setvs`
                    // },
                    condition: `!!ctx.platform.getEnvArgs().setvs`,
                    // condition: (ctx: NodeActivityContext) => ctx.platform.getEnvArgs().setvs,
                    body: [{
                        activity: 'asset',
                        name: 'version-setting',
                        src: 'packages/**/package.json',
                        dist: 'packages',
                        pipes: [
                            <JsonReplaceActivityOption>{
                                activity: 'jsonReplace',
                                fields: (json, ctx) => {
                                    let chgs = new Map<string, any>();
                                    let version = ctx.platform.getEnvArgs().setvs;
                                    chgs.set('version', version);
                                    Object.keys(json.peerDependencies || {}).forEach(key => {
                                        if (/^@tsdi/.test(key)) {
                                            chgs.set('peerDependencies.' + key, '~' + version);
                                        }
                                    });
                                    Object.keys(json.dependencies || {}).forEach(key => {
                                        if (/^@tsdi/.test(key)) {
                                            chgs.set('dependencies.' + key, '~' + version);
                                        }
                                    });
                                    return chgs;
                                }
                            }]
                    },
                    {
                        activity: 'asset',
                        src: 'package.json',
                        dist: '.',
                        pipes: [
                            <JsonReplaceActivityOption>{
                                activity: 'jsonReplace',
                                fields: (json, ctx) => {
                                    let version = ctx.platform.getEnvArgs().setvs;
                                    return { version: version };
                                }
                            }]
                    }]
                },
                {
                    activity: 'each',
                    each: (ctx: NodeActivityContext) => ctx.platform.getFolders('packages').filter(f => !f.endsWith('component') && !f.endsWith('unit-karma')),
                    // parallel: true,
                    body: {
                        activity: 'execute',
                        action: async (ctx) => {
                            let activitys = Object.values(require(path.join(ctx.getInput(), 'taskfile.ts'))).filter(b => isAcitvityClass(b)) as Type<Activity<any>>[];
                            // await ctx.getExector().runActivity(ctx, activitys);
                            await Workflow.run(lang.first(activitys));
                        }
                    }
                },
                {
                    activity: 'asset',
                    src: 'dist/**/*.d.ts',
                    pipes: [
                        () => through.obj(function (file, encoding, callback) {
                            if (file.isNull()) {
                                return callback(null, file);
                            }

                            if (file.isStream()) {
                                return callback('doesn\'t support Streams');
                            }

                            let contents: string = file.contents.toString('utf8');
                            let sets: string[] = [];
                            contents = contents.replace(/set\s\w+\(.+\)\;/g, match => {
                                sets.push(match.substring(4, match.indexOf('(')));
                                return '';
                            });
                            contents = contents.replace(/get\s\w+\(\)\:\s/g, match => {
                                let field = match.substring(4, match.length - 4);
                                return `${sets.indexOf(field) >= 0 ? '' : 'readonly '}${field}:`;
                            });

                            file.contents = Buffer.from(contents);
                            callback(null, file);
                        })
                    ],
                    dist: 'dist'
                }
            ]
        },
        {
            activity: 'if',
            condition: (ctx: NodeActivityContext) => ctx.platform.getEnvArgs().deploy,
            body: {
                activity: 'shell',
                shell: (ctx: NodeActivityContext) => {
                    let packages = ctx.platform.getFolders('dist');
                    let cmd = 'npm publish --access=public --registry="https://registry.npmjs.org"'; // envArgs.deploy ? 'npm publish --access=public' : 'npm run build';

                    let shells = packages.map(fd => {
                        return `cd ${fd} && ${cmd}`;
                    });
                    console.log(shells);
                    return shells;
                }
            }
        }
    ]
})
export class BuilderTsIoc {

}

Workflow.run(BuilderTsIoc)
