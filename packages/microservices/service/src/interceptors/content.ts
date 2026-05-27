export abstract class ContentInterceptor {
    abstract intercept(input: any, next: any, context: any): any;
}
