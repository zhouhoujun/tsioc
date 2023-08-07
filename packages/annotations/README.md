# packaged @tsdi/annotations

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).
Please file issues and pull requests against that repo.

typescript class annotations is a solution for typescript class compile to es5 uglify.  for project used tsioc to es5 uglify.

## Install

You can install this package either with `npm`.

### npm

```shell

npm install @tsdi/annotations --save-dev

```

## Demo for gulp

```ts
import { classAnnotations } '@tsdi/annotations';
const ts = require('gulp-typescript');
gulp.src('src/**/*.ts')
    .pipe(classAnnotations())
    .pipe(ts)

```

## Demo for rollup

```ts
import { rollupClassAnnotations } '@tsdi/annotations';

rollup({
  input: "main.ts",
  plugins: [rollupClassAnnotations()],
});

```

## Demo for pack build

```ts
@Pack({
    baseURL: __dirname,
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', annotation: true, uglify: false }
    }
})
export class AnnoBuilder {
}


```

```shell
pk build [taskfile.ts]
```

https://github.com/zhouhoujun/tsioc.git


## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/logger document](https://github.com/zhouhoujun/tsioc/tree/master/packages/logger).
* [@tsdi/common document](https://github.com/zhouhoujun/tsioc/tree/master/packages/common).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/transport document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport).
* [@tsdi/transport-amqp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-amqp).
* [@tsdi/transport-coap document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-coap).
* [@tsdi/transport-http document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-http).
* [@tsdi/transport-kafka document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-kafka).
* [@tsdi/transport-mqtt document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-mqtt).
* [@tsdi/transport-nats document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-nats).
* [@tsdi/transport-redis document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-redis).
* [@tsdi/transport-tcp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-tcp).
* [@tsdi/transport-udp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-udp).
* [@tsdi/transport-ws document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-ws).
* [@tsdi/swagger document](https://github.com/zhouhoujun/tsioc/tree/master/packages/swagger).
* [@tsdi/repository document](https://github.com/zhouhoujun/tsioc/tree/master/packages/repository).
* [@tsdi/typeorm-adapter document](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
* [@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
* [@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
* [@tsdi/compiler document](https://github.com/zhouhoujun/tsioc/tree/master/packages/compiler).
* [@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
* [@tsdi/pack document](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack).
* [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
* [@tsdi/unit-console document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
* [@tsdi/cli document](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).



### packages
[@tsdi/cli](https://www.npmjs.com/package/@tsdi/cli)
[@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc)
[@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop)
[@tsdi/logger](https://www.npmjs.com/package/@tsdi/logger)
[@tsdi/common](https://www.npmjs.com/package/@tsdi/common)
[@tsdi/core](https://www.npmjs.com/package/@tsdi/core)
[@tsdi/transport](https://www.npmjs.com/package/@tsdi/transport)
[@tsdi/transport-amqp](https://www.npmjs.com/package/@tsdi/transport-amqp)
[@tsdi/transport-coap](https://www.npmjs.com/package/@tsdi/transport-coap)
[@tsdi/transport-http](https://www.npmjs.com/package/@tsdi/transport-http)
[@tsdi/transport-kafka](https://www.npmjs.com/package/@tsdi/transport-kafka)
[@tsdi/transport-mqtt](https://www.npmjs.com/package/@tsdi/transport-mqtt)
[@tsdi/transport-nats](https://www.npmjs.com/package/@tsdi/transport-nats)
[@tsdi/transport-redis](https://www.npmjs.com/package/@tsdi/transport-redis)
[@tsdi/transport-tcp](https://www.npmjs.com/package/@tsdi/transport-tcp)
[@tsdi/transport-udp](https://www.npmjs.com/package/@tsdi/transport-udp)
[@tsdi/transport-ws](https://www.npmjs.com/package/@tsdi/transport-ws)
[@tsdi/swagger](https://www.npmjs.com/package/@tsdi/swagger)
[@tsdi/repository](https://www.npmjs.com/package/@tsdi/repository)
[@tsdi/typeorm-adapter](https://www.npmjs.com/package/@tsdi/typeorm-adapter)
[@tsdi/boot](https://www.npmjs.com/package/@tsdi/boot)
[@tsdi/components](https://www.npmjs.com/package/@tsdi/components)
[@tsdi/compiler](https://www.npmjs.com/package/@tsdi/compiler)
[@tsdi/activities](https://www.npmjs.com/package/@tsdi/activities)
[@tsdi/pack](https://www.npmjs.com/package/@tsdi/pack)
[@tsdi/unit](https://www.npmjs.com/package/@tsdi/unit)
[@tsdi/unit-console](https://www.npmjs.com/package/@tsdi/unit-console)


## License

MIT © [Houjun](https://github.com/zhouhoujun/)