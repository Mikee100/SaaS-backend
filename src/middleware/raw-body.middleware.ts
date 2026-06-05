import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    void res;
    const mutableReq = req as RawBodyRequest;
    const isBillingWebhook = req.originalUrl?.includes('/billing/webhook');
    if (isBillingWebhook) {
      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        mutableReq.rawBody = Buffer.from(data, 'utf8');
        next();
      });
    } else {
      next();
    }
  }
}
