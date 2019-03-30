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
  pk --help  //show help
  pk -V  //show version of cli.
```

### init project
```
//init project with tsioc, dev: save in devDependencies or dependencies.
pk init [--browser] [--version tsioc_version] [--dev]

//init project with bootstrap, dev: save in devDependencies or dependencies.
pk init boot [--browser] [--version tsioc_version] [--dev] 

//init project with workflow, dev: save in devDependencies or dependencies.
pk init activity [--browser] [--version tsioc_version] [--dev]

//init project with build pack, dev: save in devDependencies or dependencies.
pk init pack [--browser] [--version tsioc_version] [--dev]

```

### build pack
```
pk run [--activity] [taskfile.ts] [--your_env_arg=val]...
pk build [taskfile config]  [--your_env_arg=val]...
```

### Unit test

```shell
pk test [test/**/*.(ts|js)]
```



## License

MIT © [Houjun](https://github.com/zhouhoujun/)