import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private static readonly VALID_REQUEST_ID = /^[\w\-]{1,128}$/;

  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'] as string | undefined;
    const requestId =
      incoming && RequestIdMiddleware.VALID_REQUEST_ID.test(incoming)
        ? incoming
        : randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
