import { Controller, Get } from '@nestjs/common';

@Controller()
export class RootController {
  @Get()
  info() {
    return {
      name: 'Addis Tiggena API',
      version: '0.1.0',
      status: 'running',
      docs: 'see docs/04-architecture.md in the repository',
      endpoints: [
        'GET  /health',
        'GET  /catalog/categories',
        'GET  /providers/availability?lat&lng&categoryId',
        'POST /auth/otp/request',
        'POST /auth/otp/verify',
        'POST /bookings (auth)',
        'GET  /bookings/mine (auth)',
        'POST /payments/:bookingId/initiate (auth)',
        'POST /reviews (auth)',
        'GET  /admin/* (admin)',
      ],
    };
  }
}
