import { Module } from '@nestjs/common';
import { DoadoresService } from './doadores.service';
import { DoadoresController } from './doadores.controller';
import { Ms4Module } from '../ms4/ms4.module';

@Module({
  imports: [Ms4Module],
  controllers: [DoadoresController],
  providers: [DoadoresService],
})
export class DoadoresModule {}
