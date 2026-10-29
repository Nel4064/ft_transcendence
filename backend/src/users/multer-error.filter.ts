import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterErrorFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let message = '文件上传错误';
    if (exception.code === 'LIMIT_FILE_SIZE') {
      message = '上传的文件体积过大，请控制在 2MB 以内！'; // 👈 这里可以自定义文件过大的提示语
    }

    // 返回规范的 JSON 错误，前端就不会报 Unexpected token '<' 了
    response.status(400).json({
      statusCode: 400,
      message: message,
      error: 'Bad Request',
    });
  }
}