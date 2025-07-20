import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
// import { emailQueue } from './queue';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }

  // @Post('demo-email')
  // async queueDemoEmail(@Body() body: { to: string; subject: string; message: string }) {
  //   await emailQueue.add('send', body);
  //   return { status: 'queued', ...body };
  // }
}
