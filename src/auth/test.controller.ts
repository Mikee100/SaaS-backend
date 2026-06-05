import { Controller, Post, Body } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Post('ping')
  ping(@Body() body: unknown) {
    console.log('Ping received:', body);
    return { message: 'pong', received: body };
  }
}
