import { Injectable } from '@tsdi/ioc';
import { Bean, Configuration } from '@tsdi/core';

@Injectable()
export class BeanValue {}

@Configuration()
export class TypedConfiguration {
    @Bean()
    makeBean(): BeanValue {
        return new BeanValue();
    }
}
