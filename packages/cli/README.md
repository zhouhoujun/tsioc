# packaged @tsdi/cli
`@tsdi/cli` is project build pack tools cli, base on AOP, Ioc container, via @tsdi. file stream pipes activities.

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc/blob/master/packages/cli#readme).
Please file issues and pull requests against that repo.


## Install


install cli

### cli in global
```shell
npm install -g '@tsdi/cli'
```

```
  tsdi --help  //show help
  tsdi -V  //show version of cli.
```

### init project
```
//init project with tsioc, dev: save in devDependencies or dependencies.
tsdi init [--browser] [--version tsioc_version] [--dev]

//init project with bootstrap, dev: save in devDependencies or dependencies.
tsdi init boot [--browser] [--version tsioc_version] [--dev] 

//init project with workflow, dev: save in devDependencies or dependencies.
tsdi init activity [--browser] [--version tsioc_version] [--dev]

//init project with build pack, dev: save in devDependencies or dependencies.
tsdi init pack [--browser] [--version tsioc_version] [--dev]

```

### build pack
```
tsdi run [--activity] [taskfile.ts] [--your_env_arg=val]...
tsdi build [taskfile config]  [--your_env_arg=val]...
```

### Unit test

```shell
tsdi test [test/**/*.(ts|js)]
```


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