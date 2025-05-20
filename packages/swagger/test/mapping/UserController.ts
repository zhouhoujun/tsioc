import { Inject, Injector, lang } from '@tsdi/ioc';
import { RouteMapping } from '@tsdi/endpoints';
import { ApiOperation, ApiParam } from '@tsdi/swagger';
import { User } from '../models/models';
import { InjectRepository } from '@tsdi/repository';
import { Repository } from 'typeorm';
// import { UserRepository } from '../repositories/UserRepository';

@RouteMapping('/users')
export class UserController {

    @Inject() injector!: Injector;

    constructor(@InjectRepository(User) private repo: Repository<User>) {

    }

    @ApiOperation('get users.')
    @RouteMapping('/:name', 'GET')
    getUser(@ApiParam({ name: 'name', description: 'user name' ,required: true}) name: string) {
        console.log('name:', name);
        return this.repo.findAndCount({ where: { account: name } });
    }

    @RouteMapping('/', 'POST')
    @RouteMapping('/', 'PUT')
    async modify(user: User) {
        console.log(lang.getTypeName(this.repo), user);
        const val = await this.repo.save(user);
        console.log(val);
        return val;
    }

    @RouteMapping('/:id', 'DELETE')
    async del(id: string) {
        console.log('id:', id);
        await this.repo.delete(id);
        return true;
    }

}
