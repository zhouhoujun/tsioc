# packaged @tsdi/typeorm-adapter

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/type-mvc).

`@tsdi/typeorm-adapter` is model parser for boot frameworker. base on ioc [`@tsdi`](https://www.npmjs.com/package/@tsdi/core). help you develop your project easily.



## Install

You can install this package either with `npm`

### npm

```shell

npm install @tsdi/typeorm-adapter


```

## Documentation

### add orm for application

```ts
import { BootApplication, DIModule }  from '@tsdi/boot';
import { TypeOrmModule }  from '@tsdi/typeorm-adapter';

export class MyService extends Service {
    @Inject()
    dbhelper: TypeOrmHelper;

    async configureService(ctx: IBootContext): Promise<void> {
        const resp = this.dbhelper.getRepository(Production);
        // todo configuer service.
    }
    // ......
}

@EntityRepository(Production)
export class ProductionRepository extends Repository<Production> {

  async findById(id: string) {
    return await this.findOne(id);
  }

  async removeById(id: string) {
    const pdtline = await this.findOne(id);
    return await this.remove(pdtline);
  }

  async serarch(...args) {
      // do sth..
  }
  ...
}

@Injectable()
export class SerachProduction {

    @Inject() //or @AutoWired()
    resp: ProductionRepository;


    dosth(){
        this.resp.search(...)
    }


} 

@DIModule({
    // baseURL: __dirname,
    imports: [
        TypeOrmModule
        //...  you service, or controller, some extends module.
    ],
    providers:[
        SerachProduction
    ],
    bootstrap:  MyService
    debug: true
})
export class MyApp {
    constructor() {
        console.log('boot my application');
    }
}

BootApplication.run(MyApp);
```


### add orm for mvc application

```ts
import { MvcApplication, DefaultMvcMiddlewares, MvcModule, MvcServer } from '@mvx/mvc';
import { TypeOrmModule }  from '@tsdi/typeorm-adapter';


@Cors
@Authorization()
@Controller('/api/production')
export class ProductionController {


    @Inject()
    rep: ProductionRepository;

    @Post('/')
    @Put('/')
    async save(pdt: Production) {
        const r = await this.rep.save(pdt);
        return ResponseResult.success(r);
    }

    @Delete('/:id')
    async removeById(id: string) {
        const r = await this.rep.removeById(id);
        return ResponseResult.success(r);
    }

    @Get('/:id')
    async get(id: string) {
        const pdtline = await this.rep.findById(id);
        return ResponseResult.success(pdtline);
    }

    @Get('/')
    async query(keywords?: string, skip?: number, take?: number) {
        const r = await this.rep.search(keywords, skip, take);
        return ResponseResult.success(r[0], r[1]);
    }
}

// 1. use MvcHostBuilder to boot application.
MvcApplication.run();

// 2. use bootstrap module to boot application

@MvcModule({
    // baseURL: __dirname,
    imports: [
        TypeOrmModule
        //...  you service, or controller, some extends module.
    ],
    debug: true
})
class MvcApi {
    constructor() {
        console.log('boot application');
    }
}


// 3. use MvcHostBuilder to boot application module.

@MvcModule({
    imports: [
        TypeOrmModule
        // ... /...  you service, or controller, some extends module.
        // DebugLogAspect
    ]
    // bootstrap: MvcServer
})
class MvcApi {

}

MvcApplication.run(MvcApi);


//4. use bootstrap module to boot application by main.
@MvcModule({
    imports: [
        TypeOrmModule
        // ...
    ],
    // bootstrap: MvcServer,
    debug: true
})
class MvcApi {
    constructor() {
        console.log('boot application');
    }

    static main() {
        console.log('run mvc api...');
        MvcApplication.run(MvcApi);
    }
}


```

## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
* [@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
* [@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
* [@tsdi/typeorm-adapter document](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
* [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
* [@tsdi/unit-console document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
* [@tsdi/cli document](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)