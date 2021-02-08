import { Boot, IBootContext, RouteMapping, StartupService } from '@tsdi/boot';
import { Inject, Injector, lang } from '@tsdi/ioc';
import { User } from '../models/models';
import { UserRepository } from '../repositories/UserRepository';

@RouteMapping('/users')
export class UserController {

    @Inject() injector: Injector;

    constructor(public usrRep: UserRepository) {

    }


    @RouteMapping('/:name', 'get')
    getUser(name: string) {
        console.log('name:', name);
        return this.usrRep.findByAccount(name);
    }

    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    async modify(user: User) {
        console.log(lang.getClassName(this.usrRep), this.usrRep.save, user);
        let val = await this.usrRep.save(user);
        console.log(val);
        return val;
    }

    @RouteMapping('/:id', 'delete')
    async del(id: string) {
        console.log('id:', id);
        await this.usrRep.delete(id);
        return true;
    }

}


@Boot()
export class RouteStartup extends StartupService {
   
    async configureService(ctx: IBootContext): Promise<void> {
        ctx.injector.registerType(UserController);
    }

}
