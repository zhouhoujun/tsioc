export abstract class JsonInterceptor {
    abstract intercept(input: any, next: any, context: any): any;
}
