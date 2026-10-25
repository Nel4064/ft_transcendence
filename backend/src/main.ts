import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. 必须有这一行，否则 /api/auth/login 会变成 404
  app.setGlobalPrefix('api');

  // 2. 必须有这一行，否则前端网页会报跨域/网络错误
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();