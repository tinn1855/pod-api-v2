import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskAssigneesService } from './task-assignees.service';
import { TaskAssigneesController } from './task-assignees.controller';
import { SharedServicesModule } from '../common/services/shared-services.module';

@Module({
  imports: [SharedServicesModule],
  controllers: [TasksController, TaskAssigneesController],
  providers: [TasksService, TaskAssigneesService],
  exports: [TasksService, TaskAssigneesService],
})
export class TasksModule {}

