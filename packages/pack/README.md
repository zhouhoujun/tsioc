# packaged @tsdi/pack
`@tsdi/pack` is project build pack tools, base on AOP, Ioc container, via @tsdi. file stream pipes activities.

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc/blob/master/packages/activities#readme).
Please file issues and pull requests against that repo.


## Install

1. install modules:

```shell
npm install @tsdi/pack
```

2. install cli | build pack:

### cli in global
```shell
npm install -g '@tsdi/cli'
```
### build pack
```
npm install '@tsdi/pack'
```

use command: `tsdi run [taskfile.ts], tsdi run [taskfile.js]`
use command: `tsdi build [options]`

You can `import` modules:


## Doc

### Define Task

* define task component or attr task item.

```ts

@Task('clean, [clean]')
export class CleanActivity extends Activity<void> {

    @Input() clean: Expression<Src>;

    async execute(ctx: NodeActivityContext): Promise<void> {
        let clean = await this.resolveExpression(this.clean, ctx);
        if (clean) {
            await ctx.del(ctx.toRootSrc(clean), {force: true});
        }
    }
}


```

* control flow activities.

see [control flow codes](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities/src/activities)


### Define component pipe

``` ts
@Pipe('tsjs')
export class TypeScriptJsPipe implements IPipeTransform  {
    transform(value: any): any {
        return value.js ?? value;
    }
}

@Pipe('dts')
export class TypeScriptDtsPipe implements IPipeTransform {
    transform(value: any): any {
        return value.dts;
    }
}

@Pipe('path')
export class PathPipe implements IPipeTransform {
    transform(value: any, defaults: string): any {
        if (isString(value)) {
            return value;
        }
        return value ? defaults : null;
    }
}
```


### Define component Task

```ts

/**
 * ts build option.
 *
 * @export
 * @interface TsBuildOption
 * @extends {AssetActivityOption}
 */
export interface TsBuildOption extends AssetActivityOption {
    test?: Binding<NodeExpression<Src>>;
    annotation?: Binding<NodeExpression<boolean>>;
    tsconfig?: Binding<NodeExpression<string | CompilerOptions>>;
    dts?: Binding<NodeExpression<string>>;
    uglify?: Binding<NodeExpression<boolean>>;
    uglifyOptions?: Binding<NodeExpression>;
}

@Task({
    selector: 'ts',
    template: [
        {
            activity: 'src',
            src: 'binding: src',
        },
        {
            activity: 'annotation',
            annotationFramework: 'binding: annotationFramework',
            annotation: 'binding: annotation'
        },
        {
            activity: Activities.if,
            condition: 'binding: sourcemap',
            body: {
                name: 'sourcemap-init',
                activity: Activities.execute,
                action: (ctx: NodeActivityContext, bind) => {
                    let scope = bind.getScope<TsBuildActivity>();
                    let framework = scope.framework || sourcemaps;
                    return ctx.injector.get(TransformService).executePipe(ctx, ctx.getData(), framework.init())
                }
            }
        },
        {
            activity: Activities.if,
            condition: (ctx, bind) => bind.getScope<TsBuildActivity>().beforePipes?.length > 0,
            body: {
                activity: 'pipes',
                pipes: 'binding: beforePipes'
            }
        },
        {
            activity: Activities.execute,
            name: 'tscompile',
            action: async (ctx: NodeActivityContext, bind) => {
                let scope = bind.getScope<TsBuildActivity>();
                if (!scope.tsconfig) {
                    return;
                }
                let tsconfig = await ctx.resolveExpression(scope.tsconfig);
                let tsCompile;
                let dts = await ctx.resolveExpression(scope.dts);
                if (isString(tsconfig)) {
                    let tsProject = ts.createProject(ctx.platform.relativeRoot(tsconfig), { declaration: !!dts });
                    tsCompile = tsProject();
                } else {
                    tsconfig.declaration = !!dts;
                    let tsProject = ts.createProject(ctx.platform.relativeRoot('./tsconfig.json'), tsconfig);
                    tsCompile = tsProject();
                }
                return await ctx.injector.get(TransformService).executePipe(ctx, ctx.getData(), tsCompile);
            }
        },
        {
            activity: Activities.if,
            // externals: async (ctx) => {
            //     let tds = await ctx.resolveExpression(ctx.getScope<TsBuildActivity>().dts);
            //     return tds ? {
            //         data: 'ctx.getData() | tsjs'
            //     } : null;
            // },
            externals: {
                data: 'ctx.getData() | tsjs'
            },
            condition: ctx => isTransform(ctx.getData()),
            body: [
                {
                    activity: 'pipes',
                    pipes: 'binding: pipes'
                },
                {
                    activity: 'if',
                    condition: 'binding: uglify',
                    body: {
                        activity: 'uglify',
                        uglifyOptions: 'binding: uglifyOptions'
                    }
                },
                {
                    activity: Activities.if,
                    condition: 'binding: sourcemap',
                    body: {
                        name: 'sourcemap-write',
                        activity: Activities.execute,
                        action: async (ctx: NodeActivityContext, bind) => {
                            let scope = bind.getScope<TsBuildActivity>();
                            let framework = scope.framework || sourcemaps;
                            return await ctx.injector.get(TransformService).executePipe(ctx, ctx.getData(), framework.write(isString(scope.sourcemap) ? scope.sourcemap : './sourcemaps'));
                        }
                    }
                },
                {
                    name: 'write-js',
                    activity: 'dist',
                    dist: 'binding: dist'
                }
            ]
        },
        {
            activity: Activities.if,
            externals: {
                data: 'ctx.getData() | dts'
            },
            condition: 'binding: dts',
            body: {
                name: 'write-dts',
                activity: 'dist',
                dist: 'binding: dts | path:dist',
            }
        }
    ]
})
export class TsBuildActivity {
    @Input() dist: string;
    @Input() dts: string | bool;
    @Input() annotation: boolean;
    @Input('annotationFramework') annotationFramework: NodeExpression<ITransform>;
    @Input('beforePipes') beforePipes: ActivityType<ITransform>[];
    @Input('tsconfig', './tsconfig.json') tsconfig: string | ObjectMap;
    @Input() uglify: NodeExpression<boolean>;
    @Input('uglifyOptions') uglifyOptions: any;
}

```


### Run task

* use coustom task component.
```ts
@Task({
    deps: [
        PackModule,
        ServerActivitiesModule,
        TsBuildActivity
    ],
    baseURL: __dirname,
    template: <TsBuildOption>{
        activity: 'ts',
        annotation: true,
        dist: 'dist',
        dts: 'dist',
        sourcemap: true
    }
})
export class PackBuilder implements AfterInit {

    onAfterInit(): void | Promise<void> {
        console.log('activities build has inited...')
    }
}


```

* run task.
```ts
// 1. run modue
Workflow.run(PackBuilder);


// 2. run option
Workflow.run({
    name: 'test1',
    template: [
        {
            name: 'test------1',
            activity: SimpleTask
        },
        SimpleCTask
        // {
        //     name: 'test------2',
        //     activity: SimpleCTask
        // }
    ]

});
```


## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
* [@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
* [@tsdi/compiler document](https://github.com/zhouhoujun/tsioc/tree/master/packages/compiler).
* [@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
* [@tsdi/pack document](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack).
* [@tsdi/typeorm-adapter document](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
* [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
* [@tsdi/unit-console document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
* [@tsdi/cli document](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).



### packages
[@tsdi/cli](https://www.npmjs.com/package/@tsdi/cli)
[@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc)
[@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop)
[@tsdi/core](https://www.npmjs.com/package/@tsdi/core)
[@tsdi/boot](https://www.npmjs.com/package/@tsdi/boot)
[@tsdi/components](https://www.npmjs.com/package/@tsdi/components)
[@tsdi/compiler](https://www.npmjs.com/package/@tsdi/compiler)
[@tsdi/activities](https://www.npmjs.com/package/@tsdi/activities)
[@tsdi/pack](https://www.npmjs.com/package/@tsdi/pack)
[@tsdi/typeorm-adapter](https://www.npmjs.com/package/@tsdi/typeorm-adapter)
[@tsdi/unit](https://www.npmjs.com/package/@tsdi/unit)
[@tsdi/unit-console](https://www.npmjs.com/package/@tsdi/unit-console)

## License

MIT © [Houjun](https://github.com/zhouhoujun/)