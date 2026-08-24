import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [NotificationsModule, AuditModule, BookingsModule],
  controllers: [AdminController],
})
export class AdminModule {}
