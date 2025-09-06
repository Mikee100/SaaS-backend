import { Controller, Post, Body } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Post('ping')
  ping(@Body() body: any) {
    console.log('Ping received:', body);
    return { message: 'pong', received: body };
  }
}