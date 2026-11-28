import { Module } from '@nestjs/common';
import { Ms4Module } from '../ms4/ms4.module';
import { HealthController } from './health.controller';

@Module({
  imports: [Ms4Module],
  controllers: [HealthController],
})
export class HealthModule {}