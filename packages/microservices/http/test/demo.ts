import { Injectable, Module, token } from '@tsdi/ioc';
import { Controller, Get, Post, RequestBody, RequestParam, RequestPath, RequestHeader } from '@tsdi/service';
import { of } from 'rxjs';
import { BadRequestException } from '@tsdi/common';

export const SENSORS = token<string[]>('SENSORS');

@Controller('/device')
export class DeviceController {

    @Get('/')
    list(@RequestParam({ nullable: true }) name: string) {
        return name ? [{ name: '1' }, { name: '2' }].filter(i => i.name === name) : [{ name: '1' }, { name: '2' }];
    }

    @Post('/init')
    req(name: string) {
        return { name };
    }

    @Post('/usage')
    usage(@RequestBody() id: string, @RequestBody('age') year: string, @RequestBody('createAt') createAt: string) {
        return { id, year, createAt };
    }

    @Get('/usege/find')
    find(@RequestParam('age') age: string) {
        return age;
    }

    @Get('/:age/used')
    used(@RequestPath('age') age: string) {
        if (age && parseInt(age) <= 0) {
            throw new BadRequestException('Invalid age');
        }
        return age;
    }

    @Post('/update')
    update(version: string) {
        return version;
    }

    @Get('/status')
    status() {
        return of('working');
    }

    @Get('/echo-header')
    echoHeader(@RequestHeader('x-custom') header: string) {
        return { header };
    }
}

@Injectable()
export class MyService {
    dosth() {
        return 'startuped';
    }
}

@Module({
    providers: [MyService],
    declarations: [DeviceController]
})
export class DeviceModule {
}

@Controller('/api/cors-test')
export class CorsTestController {
    @Get('/info')
    info() {
        return { status: 'ok', message: 'CORS works' };
    }

    @Post('/data')
    data(@RequestBody() body: any) {
        return { received: body };
    }
}

@Module({
    declarations: [CorsTestController]
})
export class CorsTestModule {
}
