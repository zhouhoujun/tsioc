import { InternalServerException } from '@tsdi/common/transport';
import { Controller, Delete, Get, Post, Put, RequestParam, RequestPath } from '@tsdi/endpoints';
import { getTypeName } from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logger';
import { Repository, Transactional } from '@tsdi/repository';
import { Repository as TypeormRepository } from 'typeorm';
import { User } from '../models/User';
import { UserService } from './user.service';
import { Api, ApiOperation, ApiParam } from '@tsdi/swagger';
import { Authorization } from '@tsdi/security';

@Authorization()
@Api('user manager')
@Controller('/users')
export class UserController {

    constructor(private usrService: UserService, @Log() private logger: Logger) {

    }

    @ApiOperation('query users')
    @Get('/')
    search(@RequestParam({ nullable: true }) name: string) {
        return this.usrService.search(name);
    }

    @ApiOperation('get user by account', User)
    @Get('/:account')
    getUser(
        @ApiParam({ name: 'name', description: 'user account', required: true }) 
        @RequestPath() account: string) {
        this.logger.log('account:', account);
        if (account == 'error') {
            throw new InternalServerException('error');
        }
        return this.usrService.findByAccount(account);
    }

    @ApiOperation('save user with transactional in control', User)
    @Post('/')
    @Put('/')
    async modify(user: User, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(getTypeName(this.usrService), user);
        const val = await this.usrService.save(user, check);
        this.logger.log(val);
        return val;
    }

    @ApiOperation('save user with transactional in method', User)
    @Transactional()
    @Post('/save')
    @Put('/save')
    async modify2(user: User, @Repository(User) userRepo: TypeormRepository<User>, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(getTypeName(this.usrService), user);
        const val = await userRepo.save(user);
        if (check) throw new InternalServerException('check');
        this.logger.log(val);
        return val;
    }

    @Delete('/:id')
    async del(@RequestPath() id: string, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log('id:', id);
        await this.usrService.delete(id, check);
        return true;
    }

}

