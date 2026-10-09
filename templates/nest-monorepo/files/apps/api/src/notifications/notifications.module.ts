import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers';
import { NotificationsService } from './services';

@Module({
	controllers: [NotificationsController],
	providers: [NotificationsService],
	// Exported so any producing module can dispatch notifications.
	exports: [NotificationsService]
})
export class NotificationsModule {}
