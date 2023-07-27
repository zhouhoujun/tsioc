import { Inject, Injector, lang } from '@tsdi/ioc';
import { RouteMapping } from '@tsdi/transport';
import { ApiOperation, ApiParam } from '@tsdi/swagger';
import { User } from '../models/models';
import { UserRepository } from '../repositories/UserRepository';

@RouteMapping('/users')
export class UserController {

    @Inject() injector!: Injector;

    constructor(public usrRep: UserRepository) {

    }

    @ApiOperation('get users.')
    @RouteMapping('/:name', 'GET')
    getUser(@ApiParam({ name: 'name', required: true}) name: string) {
        console.log('name:', name);
        return this.usrRep.findByAccount(name);
    }

    @RouteMapping('/', 'POST')
    @RouteMapping('/', 'PUT')
    async modify(user: User) {
        console.log(lang.getClassName(this.usrRep), user);
        const val = await this.usrRep.save(user);
        console.log(val);
        return val;
    }

    @RouteMapping('/:id', 'DELETE')
    async del(id: string) {
        console.log('id:', id);
        await this.usrRep.delete(id);
        return true;
    }

}
