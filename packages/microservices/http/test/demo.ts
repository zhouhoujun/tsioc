import { Injectable, Module } from '@tsdi/ioc';
import { Controller, Get } from '@tsdi/service';

@Injectable()
export class CorsTestService {
    info() {
        return { status: 'ok' };
    }
}

@Controller('/api/cors-test')
export class CorsTestController {
    constructor(private service: CorsTestService) { }

    @Get('/info')
    info() {
        return this.service.info();
    }

    @Get('/data')
    data() {
        return { value: 'demo' };
    }
}

@Module({
    declarations: [CorsTestController],
    providers: [CorsTestService]
})
export class CorsTestModule { }
