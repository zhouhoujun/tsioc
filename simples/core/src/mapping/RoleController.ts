import { RouteMapping, RequestParam, RequestPath } from '@tsdi/endpoints';
import { Log, Logger } from '@tsdi/logger';
import { InjectRepository, Transactional } from '@tsdi/repository';
import { Repository } from 'typeorm';
import { Role } from '../models/Role';
import { Api, ApiOperation } from '@tsdi/swagger';
import { Authorization } from '@tsdi/security';


@Api('role manager')
@RouteMapping('/roles')
export class RoleController {

    constructor(@InjectRepository(Role) private repo: Repository<Role>, @Log() private logger: Logger) {

    }
    

    @Authorization()
    @ApiOperation('save role with transactional in control', Role)
    @Transactional()
    @RouteMapping('/', 'POST')
    @RouteMapping('/', 'PUT')
    async save(role: Role, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        const value = await this.repo.save(role);
        if (check) throw new Error('check');
        this.logger.info(value);
        return value;
    }

    @Authorization()
    @ApiOperation('save role with transactional in method', Role)
    @Transactional()
    @RouteMapping('/save2', 'POST')
    @RouteMapping('/save2', 'PUT')
    async save2(role: Role, @InjectRepository(Role) roleRepo: Repository<Role>, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save2 isTransactionActive:', roleRepo.queryRunner?.isTransactionActive);
        const value = await roleRepo.save(role);
        if (check) throw new Error('check');
        this.logger.info(value);
        return value;
    }

    @ApiOperation('get role by name', Role)
    @RouteMapping('/:name', 'GET')
    async getRole(@RequestPath() name: string) {
        this.logger.log('name:', name);
        console.log('getRole isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        return await this.repo.findOne({ where: { name } });
    }


    @Authorization()
    @Transactional()
    @RouteMapping('/:id', 'DELETE')
    async del(@RequestPath() id: string) {
        this.logger.log('id:', id);
        console.log('del isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        await this.repo.delete(id);
        return true;
    }


}
