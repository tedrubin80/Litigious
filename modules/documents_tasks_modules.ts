// src/modules/documents/documents.module.ts
import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

// src/modules/documents/documents.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('cases/:caseId')
  @ApiOperation({ summary: 'Get documents for a case' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  getDocuments(@Param('caseId') caseId: string, @Query() queryDto: QueryDocumentsDto) {
    return this.documentsService.getDocuments(caseId, queryDto);
  }

  @Post('cases/:caseId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document to case' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  uploadDocument(
    @Param('caseId') caseId: string,
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.documentsService.uploadDocument(caseId, createDocumentDto, file, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  getDocument(@Param('id') id: string) {
    return this.documentsService.getDocument(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  updateDocument(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.updateDocument(id, updateDocumentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  deleteDocument(@Param('id') id: string) {
    return this.documentsService.deleteDocument(id);
  }

  @Get('cases/:caseId/categories')
  @ApiOperation({ summary: 'Get document categories for a case' })
  @ApiResponse({ status: 200, description: 'Document categories retrieved successfully' })
  getDocumentCategories(@Param('caseId') caseId: string) {
    return this.documentsService.getDocumentCategories(caseId);
  }

  @Get('cases/:caseId/summary')
  @ApiOperation({ summary: 'Get document summary for a case' })
  @ApiResponse({ status: 200, description: 'Document summary retrieved successfully' })
  getDocumentSummary(@Param('caseId') caseId: string) {
    return this.documentsService.getDocumentSummary(caseId);
  }
}

// src/modules/documents/documents.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDocuments(caseId: string, queryDto: QueryDocumentsDto) {
    const { page = 1, limit = 20, type, category, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { caseId };
    if (type) where.type = type;
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async uploadDocument(
    caseId: string,
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    // Verify case exists
    const caseExists = await this.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundException('Case not found');
    }

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        name: createDocumentDto.name || file.originalname,
        type: createDocumentDto.type,
        category: createDocumentDto.category,
        filePath: `/uploads/documents/${fileName}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        description: createDocumentDto.description,
        caseId,
        uploadedById,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return document;
  }

  async getDocument(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async updateDocument(id: string, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.getDocument(id);

    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: updateDocumentDto,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedDocument;
  }

  async deleteDocument(id: string) {
    const document = await this.getDocument(id);

    // Delete file from disk
    const fullPath = path.join(process.cwd(), document.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Delete database record
    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Document deleted successfully' };
  }

  async getDocumentCategories(caseId: string) {
    const categories = await this.prisma.document.findMany({
      where: { caseId },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map(c => c.category).filter(Boolean);
  }

  async getDocumentSummary(caseId: string) {
    const [total, byType, byCategory, totalSize] = await Promise.all([
      this.prisma.document.count({ where: { caseId } }),
      this.prisma.document.groupBy({
        by: ['type'],
        where: { caseId },
        _count: true,
      }),
      this.prisma.document.groupBy({
        by: ['category'],
        where: { caseId },
        _count: true,
      }),
      this.prisma.document.aggregate({
        where: { caseId },
        _sum: { fileSize: true },
      }),
    ]);

    return {
      total,
      totalSize: totalSize._sum.fileSize || 0,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      byCategory: byCategory.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = item._count;
        }
        return acc;
      }, {}),
    };
  }
}

// src/modules/documents/dto/create-document.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @ApiPropertyOptional({ example: 'Medical Record - Dr. Smith Visit' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.MEDICAL_RECORD })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiPropertyOptional({ example: 'Medical Records' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Initial consultation and treatment plan' })
  @IsOptional()
  @IsString()
  description?: string;
}

// src/modules/documents/dto/update-document.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}

// src/modules/documents/dto/query-documents.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '@prisma/client';

export class QueryDocumentsDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ example: 'Medical Records' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'medical' })
  @IsOptional()
  @IsString()
  search?: string;
}

// ============================================================================
// TASKS MODULE
// ============================================================================

// src/modules/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

// src/modules/tasks/tasks.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('cases/:caseId')
  @ApiOperation({ summary: 'Get tasks for a case' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  getTasks(@Param('caseId') caseId: string, @Query() queryDto: QueryTasksDto) {
    return this.tasksService.getTasks(caseId, queryDto);
  }

  @Post('cases/:caseId')
  @ApiOperation({ summary: 'Create task for case' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  createTask(
    @Param('caseId') caseId: string,
    @Body() createTaskDto: CreateTaskDto,
    @Request() req,
  ) {
    return this.tasksService.createTask(caseId, createTaskDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  getTask(@Param('id') id: string) {
    return this.tasksService.getTask(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  deleteTask(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark task as completed' })
  @ApiResponse({ status: 200, description: 'Task marked as completed' })
  completeTask(@Param('id') id: string) {
    return this.tasksService.completeTask(id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign task to user' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  assignTask(@Param('id') id: string, @Body() assignData: { userId: string }) {
    return this.tasksService.assignTask(id, assignData.userId);
  }

  @Get('cases/:caseId/summary')
  @ApiOperation({ summary: 'Get task summary for a case' })
  @ApiResponse({ status: 200, description: 'Task summary retrieved successfully' })
  getTaskSummary(@Param('caseId') caseId: string) {
    return this.tasksService.getTaskSummary(caseId);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get tasks assigned to user' })
  @ApiResponse({ status: 200, description: 'User tasks retrieved successfully' })
  getUserTasks(@Param('userId') userId: string, @Query() queryDto: QueryTasksDto) {
    return this.tasksService.getUserTasks(userId, queryDto);
  }
}

// src/modules/tasks/tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async getTasks(caseId: string, queryDto: QueryTasksDto) {
    const { page = 1, limit = 20, status, priority, assignedTo, dueDateFrom, dueDateTo } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { caseId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedToId = assignedTo;
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
      if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
    }

    const [tasks, total] = await Promise.all([
      this.prisma.caseTask.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { dueDate: 'asc' },
        ],
      }),
      this.prisma.caseTask.count({ where }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createTask(caseId: string, createTaskDto: CreateTaskDto, createdById: string) {
    // Verify case exists
    const caseExists = await this.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundException('Case not found');
    }

    const task = await this.prisma.caseTask.create({
      data: {
        ...createTaskDto,
        caseId,
        createdById,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return task;
  }

  async getTask(id: string) {
    const task = await this.prisma.caseTask.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async updateTask(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.getTask(id);

    const updatedTask = await this.prisma.caseTask.update({
      where: { id },
      data: updateTaskDto,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedTask;
  }

  async deleteTask(id: string) {
    const task = await this.getTask(id);

    await this.prisma.caseTask.delete({
      where: { id },
    });

    return { message: 'Task deleted successfully' };
  }

  async completeTask(id: string) {
    const task = await this.getTask(id);

    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Task is already completed');
    }

    const updatedTask = await this.prisma.caseTask.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedTask;
  }

  async assignTask(id: string, userId: string) {
    const task = await this.getTask(id);

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedTask = await this.prisma.caseTask.update({
      where: { id },
      data: { assignedToId: userId },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedTask;
  }

  async getTaskSummary(caseId: string) {
    const [total, byStatus, byPriority, overdue] = await Promise.all([
      this.prisma.caseTask.count({ where: { caseId } }),
      this.prisma.caseTask.groupBy({
        by: ['status'],
        where: { caseId },
        _count: true,
      }),
      this.prisma.caseTask.groupBy({
        by: ['priority'],
        where: { caseId },
        _count: true,
      }),
      this.prisma.caseTask.count({
        where: {
          caseId,
          dueDate: { lt: new Date() },
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
        },
      }),
    ]);

    return {
      total,
      overdue,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority.toLowerCase()] = item._count;
        return acc;
      }, {}),
    };
  }

  async getUserTasks(userId: string, queryDto: QueryTasksDto) {
    const { page = 1, limit = 20, status, priority } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { assignedToId: userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [tasks, total] = await Promise.all([
      this.prisma.caseTask.findMany({
        where,
        skip,
        take: limit,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { dueDate: 'asc' },
        ],
      }),
      this.prisma.caseTask.count({ where }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// src/modules/tasks/dto/create-task.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ example: 'Order remaining medical records' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Contact all medical providers to request outstanding records' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, example: TaskStatus.PENDING })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus = TaskStatus.PENDING;

  @ApiPropertyOptional({ enum: TaskPriority, example: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'user-uuid-here' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

// src/modules/tasks/dto/update-task.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

// src/modules/tasks/dto/query-tasks.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsString, IsDateString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class QueryTasksDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'user-uuid-here' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;
}