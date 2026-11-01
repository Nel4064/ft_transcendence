import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterErrorFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let message = 'File upload error';
    if (exception.code === 'LIMIT_FILE_SIZE') {
      message = 'The uploaded file is too large. Please keep it under 2MB!'; // 👈 Customize the file size limit message here
    }

    // Return a standardized JSON error so the frontend won't encounter Unexpected token '<' errors
    response.status(400).json({
      statusCode: 400,
      message: message,
      error: 'Bad Request',
    });
  }
}