# packaged @ts-ioc/annotations

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).
Please file issues and pull requests against that repo.

typescript class annotations is a solution for typescript class compile to es5 uglify.  for project used tsioc to es5 uglify.

## Install

You can install this package either with `npm`.

### npm

```shell

npm install @ts-ioc/annotations --save-dev

```

## Demo

```ts
import { classAnnotations } '@ts-ioc/annotations';
const ts = require('gulp-typescript');
gulp.src('src/**/*.ts')
    .pipe(classAnnotations())
    .pipe(ts)

```

## Demo for development

```ts
Development.create(gulp, __dirname, {
    tasks:[
        <INodeTaskOption>{
            src: 'src',
            dist: 'lib',
            asserts:{
                ts: {
                    //src: '...',
                    //dist:'...',
                    loader: 'development-assert-ts',
                    //also can add pipe works here.
                    tsPipes: [
                        ()=> classAnnotations()
                    ]
                    // or some state use annotation.
                    tsPipes: (ctx) =>{
                        return (ctx.oper &  Operation.deploy?
                        [
                            ()=> classAnnotations()
                        ] : [];
                    }
                }
                ....

```

https://github.com/zhouhoujun/tsioc.git

## Documentation

Documentation is available on the
[@ts-ioc/annotations docs site](https://github.com/zhouhoujun/tsioc).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)