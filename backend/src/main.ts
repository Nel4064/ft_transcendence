import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 🌐 开启 CORS 跨域支持
  app.enableCors({
    origin: true, // 允许所有来源（开发环境推荐，或者指定具体的客户端地址）
    credentials: true, // 允许前端携带 Cookie 或 Authorization 请求头
  });
  app.setGlobalPrefix('api');
  // 托管 uploads 文件夹，使其可以通过 http://localhost:3000/uploads/... 访问
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(3000);
}
bootstrap();