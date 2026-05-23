// src/modules/incident/incident.module.ts
import { Module } from '@nestjs/common';
import { IncidentController } from './incident.controller';
import { IncidentService } from './incident.service';

@Module({
  controllers: [IncidentController],
  providers: [IncidentService],
  exports: [IncidentService],
})
export class IncidentModule {}

// src/modules/incident/incident.controller.ts
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IncidentService } from './incident.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateWitnessDto } from './dto/create-witness.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Incident')
@Controller('incident')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  // Incident Management
  @Get('cases/:caseId')
  @ApiOperation({ summary: 'Get incident details for a case' })
  @ApiResponse({ status: 200, description: 'Incident details retrieved successfully' })
  getIncident(@Param('caseId') caseId: string) {
    return this.incidentService.getIncident(caseId);
  }

  @Post('cases/:caseId')
  @ApiOperation({ summary: 'Create incident for case' })
  @ApiResponse({ status: 201, description: 'Incident created successfully' })
  createIncident(
    @Param('caseId') caseId: string,
    @Body() createIncidentDto: CreateIncidentDto,
  ) {
    return this.incidentService.createIncident(caseId, createIncidentDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update incident' })
  @ApiResponse({ status: 200, description: 'Incident updated successfully' })
  updateIncident(
    @Param('id') id: string,
    @Body() updateIncidentDto: UpdateIncidentDto,
  ) {
    return this.incidentService.updateIncident(id, updateIncidentDto);
  }

  // Vehicle Management
  @Get('cases/:caseId/vehicles')
  @ApiOperation({ summary: 'Get vehicles involved in incident' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  getVehicles(@Param('caseId') caseId: string) {
    return this.incidentService.getVehicles(caseId);
  }

  @Post('cases/:caseId/vehicles')
  @ApiOperation({ summary: 'Add vehicle to incident' })
  @ApiResponse({ status: 201, description: 'Vehicle added successfully' })
  addVehicle(
    @Param('caseId') caseId: string,
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    return this.incidentService.addVehicle(caseId, createVehicleDto);
  }

  @Patch('vehicles/:id')
  @ApiOperation({ summary: 'Update vehicle information' })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  updateVehicle(@Param('id') id: string, @Body() updateData: any) {
    return this.incidentService.updateVehicle(id, updateData);
  }

  @Delete('vehicles/:id')
  @ApiOperation({ summary: 'Remove vehicle from incident' })
  @ApiResponse({ status: 200, description: 'Vehicle removed successfully' })
  removeVehicle(@Param('id') id: string) {
    return this.incidentService.removeVehicle(id);
  }

  // Police Report Management
  @Get('cases/:caseId/police-report')
  @ApiOperation({ summary: 'Get police report for incident' })
  @ApiResponse({ status: 200, description: 'Police report retrieved successfully' })
  getPoliceReport(@Param('caseId') caseId: string) {
    return this.incidentService.getPoliceReport(caseId);
  }

  @Post('cases/:caseId/police-report')
  @ApiOperation({ summary: 'Create police report for incident' })
  @ApiResponse({ status: 201, description: 'Police report created successfully' })
  createPoliceReport(@Param('caseId') caseId: string, @Body() policeReportData: any) {
    return this.incidentService.createPoliceReport(caseId, policeReportData);
  }

  @Patch('police-reports/:id')
  @ApiOperation({ summary: 'Update police report' })
  @ApiResponse({ status: 200, description: 'Police report updated successfully' })
  updatePoliceReport(@Param('id') id: string, @Body() updateData: any) {
    return this.incidentService.updatePoliceReport(id, updateData);
  }

  // Witness Management
  @Get('cases/:caseId/witnesses')
  @ApiOperation({ summary: 'Get witnesses for incident' })
  @ApiResponse({ status: 200, description: 'Witnesses retrieved successfully' })
  getWitnesses(@Param('caseId') caseId: string) {
    return this.incidentService.getWitnesses(caseId);
  }

  @Post('cases/:caseId/witnesses')
  @ApiOperation({ summary: 'Add witness to incident' })
  @ApiResponse({ status: 201, description: 'Witness added successfully' })
  addWitness(
    @Param('caseId') caseId: string,
    @Body() createWitnessDto: CreateWitnessDto,
  ) {
    return this.incidentService.addWitness(caseId, createWitnessDto);
  }

  @Patch('witnesses/:id')
  @ApiOperation({ summary: 'Update witness information' })
  @ApiResponse({ status: 200, description: 'Witness updated successfully' })
  updateWitness(@Param('id') id: string, @Body() updateData: any) {
    return this.incidentService.updateWitness(id, updateData);
  }

  @Delete('witnesses/:id')
  @ApiOperation({ summary: 'Remove witness from incident' })
  @ApiResponse({ status: 200, description: 'Witness removed successfully' })
  removeWitness(@Param('id') id: string) {
    return this.incidentService.removeWitness(id);
  }

  // Evidence Management
  @Get('cases/:caseId/evidence')
  @ApiOperation({ summary: 'Get evidence for incident' })
  @ApiResponse({ status: 200, description: 'Evidence retrieved successfully' })
  getEvidence(@Param('caseId') caseId: string, @Query() query: any) {
    return this.incidentService.getEvidence(caseId, query);
  }

  @Post('cases/:caseId/evidence')
  @ApiOperation({ summary: 'Add evidence to incident' })
  @ApiResponse({ status: 201, description: 'Evidence added successfully' })
  addEvidence(
    @Param('caseId') caseId: string,
    @Body() createEvidenceDto: CreateEvidenceDto,
  ) {
    return this.incidentService.addEvidence(caseId, createEvidenceDto);
  }

  @Patch('evidence/:id')
  @ApiOperation({ summary: 'Update evidence information' })
  @ApiResponse({ status: 200, description: 'Evidence updated successfully' })
  updateEvidence(@Param('id') id: string, @Body() updateData: any) {
    return this.incidentService.updateEvidence(id, updateData);
  }

  @Delete('evidence/:id')
  @ApiOperation({ summary: 'Remove evidence from incident' })
  @ApiResponse({ status: 200, description: 'Evidence removed successfully' })
  removeEvidence(@Param('id') id: string) {
    return this.incidentService.removeEvidence(id);
  }

  // Complete Incident Information
  @Get('cases/:caseId/complete')
  @ApiOperation({ summary: 'Get complete incident information' })
  @ApiResponse({ status: 200, description: 'Complete incident information retrieved' })
  getCompleteIncidentInfo(@Param('caseId') caseId: string) {
    return this.incidentService.getCompleteIncidentInfo(caseId);
  }
}

// src/modules/incident/incident.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateWitnessDto } from './dto/create-witness.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';

@Injectable()
export class IncidentService {
  constructor(private readonly prisma: PrismaService) {}

  // Incident Management
  async getIncident(caseId: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { caseId },
      include: {
        policeReport: {
          include: {
            citations: true,
          },
        },
      },
    });

    return incident;
  }

  async createIncident(caseId: string, createIncidentDto: CreateIncidentDto) {
    // Verify case exists
    const caseExists = await this.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundException('Case not found');
    }

    const incident = await this.prisma.incident.create({
      data: {
        ...createIncidentDto,
        caseId,
      },
      include: {
        policeReport: {
          include: {
            citations: true,
          },
        },
      },
    });

    return incident;
  }

  async updateIncident(id: string, updateIncidentDto: UpdateIncidentDto) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    const updatedIncident = await this.prisma.incident.update({
      where: { id },
      data: updateIncidentDto,
      include: {
        policeReport: {
          include: {
            citations: true,
          },
        },
      },
    });

    return updatedIncident;
  }

  // Vehicle Management
  async getVehicles(caseId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { caseId },
      orderBy: { isClientVehicle: 'desc' },
    });

    return vehicles;
  }

  async addVehicle(caseId: string, createVehicleDto: CreateVehicleDto) {
    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...createVehicleDto,
        caseId,
      },
    });

    return vehicle;
  }

  async updateVehicle(id: string, updateData: any) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const updatedVehicle = await this.prisma.vehicle.update({
      where: { id },
      data: updateData,
    });

    return updatedVehicle;
  }

  async removeVehicle(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.prisma.vehicle.delete({
      where: { id },
    });

    return { message: 'Vehicle removed successfully' };
  }

  // Police Report Management
  async getPoliceReport(caseId: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { caseId },
      include: {
        policeReport: {
          include: {
            citations: true,
          },
        },
      },
    });

    return incident?.policeReport || null;
  }

  async createPoliceReport(caseId: string, policeReportData: any) {
    const incident = await this.prisma.incident.findUnique({
      where: { caseId },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found for this case');
    }

    const policeReport = await this.prisma.policeReport.create({
      data: {
        ...policeReportData,
        incidentId: incident.id,
      },
      include: {
        citations: true,
      },
    });

    return policeReport;
  }

  async updatePoliceReport(id: string, updateData: any) {
    const policeReport = await this.prisma.policeReport.findUnique({
      where: { id },
    });

    if (!policeReport) {
      throw new NotFoundException('Police report not found');
    }

    const updatedReport = await this.prisma.policeReport.update({
      where: { id },
      data: updateData,
      include: {
        citations: true,
      },
    });

    return updatedReport;
  }

  // Witness Management
  async getWitnesses(caseId: string) {
    const witnesses = await this.prisma.witness.findMany({
      where: { caseId },
      orderBy: { name: 'asc' },
    });

    return witnesses;
  }

  async addWitness(caseId: string, createWitnessDto: CreateWitnessDto) {
    const witness = await this.prisma.witness.create({
      data: {
        ...createWitnessDto,
        caseId,
      },
    });

    return witness;
  }

  async updateWitness(id: string, updateData: any) {
    const witness = await this.prisma.witness.findUnique({
      where: { id },
    });

    if (!witness) {
      throw new NotFoundException('Witness not found');
    }

    const updatedWitness = await this.prisma.witness.update({
      where: { id },
      data: updateData,
    });

    return updatedWitness;
  }

  async removeWitness(id: string) {
    const witness = await this.prisma.witness.findUnique({
      where: { id },
    });

    if (!witness) {
      throw new NotFoundException('Witness not found');
    }

    await this.prisma.witness.delete({
      where: { id },
    });

    return { message: 'Witness removed successfully' };
  }

  // Evidence Management
  async getEvidence(caseId: string, query: any) {
    const { type, status } = query;

    const where: any = { caseId };
    if (type) where.type = type;
    if (status) where.status = status;

    const evidence = await this.prisma.evidence.findMany({
      where,
      orderBy: { dateCollected: 'desc' },
    });

    return evidence;
  }

  async addEvidence(caseId: string, createEvidenceDto: CreateEvidenceDto) {
    const evidence = await this.prisma.evidence.create({
      data: {
        ...createEvidenceDto,
        caseId,
      },
    });

    return evidence;
  }

  async updateEvidence(id: string, updateData: any) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
    });

    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    const updatedEvidence = await this.prisma.evidence.update({
      where: { id },
      data: updateData,
    });

    return updatedEvidence;
  }

  async removeEvidence(id: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
    });

    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    await this.prisma.evidence.delete({
      where: { id },
    });

    return { message: 'Evidence removed successfully' };
  }

  // Complete Incident Information
  async getCompleteIncidentInfo(caseId: string) {
    const [incident, vehicles, witnesses, evidence, policeReport] = await Promise.all([
      this.getIncident(caseId),
      this.getVehicles(caseId),
      this.getWitnesses(caseId),
      this.getEvidence(caseId, {}),
      this.getPoliceReport(caseId),
    ]);

    return {
      incident,
      vehicles,
      witnesses,
      evidence,
      policeReport,
      summary: {
        vehicleCount: vehicles.length,
        witnessCount: witnesses.length,
        evidenceCount: evidence.length,
        hasPoliceReport: !!policeReport,
      },
    };
  }
}

// src/modules/incident/dto/create-incident.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
} from 'class-validator';
import { InjurySeverity } from '@prisma/client';

export class CreateIncidentDto {
  @ApiProperty({ example: '2015-09-20' })
  @IsNotEmpty()
  @IsDateString()
  dateOfLoss: string;

  @ApiPropertyOptional({ example: '3:45 PM' })
  @IsOptional()
  @IsString()
  timeOfIncident?: string;

  @ApiProperty({ example: '1200 Newport Center Dr' })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ example: 'Newport Beach' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'CA' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ example: '92660' })
  @IsNotEmpty()
  @IsString()
  zipCode: string;

  @ApiPropertyOptional({ example: '33.6189° N, 117.9298° W' })
  @IsOptional()
  @IsString()
  coordinates?: string;

  @ApiPropertyOptional({ example: 'Clear' })
  @IsOptional()
  @IsString()
  weather?: string;

  @ApiPropertyOptional({ example: 'Daylight' })
  @IsOptional()
  @IsString()
  lightingConditions?: string;

  @ApiPropertyOptional({ example: 'Dry' })
  @IsOptional()
  @IsString()
  roadConditions?: string;

  @ApiProperty({ example: 'Motor Vehicle Accident' })
  @IsNotEmpty()
  @IsString()
  incidentType: string;

  @ApiPropertyOptional({ example: 'Intersection Collision' })
  @IsOptional()
  @IsString()
  subType?: string;

  @ApiProperty({ enum: InjurySeverity, example: InjurySeverity.SEVERE })
  @IsEnum(InjurySeverity)
  severity: InjurySeverity;

  @ApiProperty({ example: 'T-bone collision at controlled intersection...' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: ['Running Red Light', 'Failure to Yield', 'Speeding'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  causeFactors?: string[];
}

// src/modules/incident/dto/update-incident.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateIncidentDto } from './create-incident.dto';

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {}

// src/modules/incident/dto/create-vehicle.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: '2015' })
  @IsNotEmpty()
  @IsString()
  year: string;

  @ApiProperty({ example: 'Toyota' })
  @IsNotEmpty()
  @IsString()
  make: string;

  @ApiProperty({ example: 'Camry' })
  @IsNotEmpty()
  @IsString()
  model: string;

  @ApiProperty({ example: 'Silver' })
  @IsNotEmpty()
  @IsString()
  color: string;

  @ApiPropertyOptional({ example: 'ABC123' })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({ example: '1HGBH41JXMN109186' })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({ example: 'Patricia Thowerd' })
  @IsNotEmpty()
  @IsString()
  owner: string;

  @ApiProperty({ example: 'Patricia Thowerd' })
  @IsNotEmpty()
  @IsString()
  driver: string;

  @ApiPropertyOptional({
    example: ['John Doe', 'Jane Smith'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  passengers?: string[];

  @ApiPropertyOptional({ example: 'State Farm' })
  @IsOptional()
  @IsString()
  insuranceCompany?: string;

  @ApiPropertyOptional({ example: 'SF-789456123' })
  @IsOptional()
  @IsString()
  policyNumber?: string;

  @ApiPropertyOptional({ example: 'Severe front-end damage' })
  @IsOptional()
  @IsString()
  damages?: string;

  @ApiPropertyOptional({ example: 'Mike\'s Auto Body' })
  @IsOptional()
  @IsString()
  towedTo?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isClientVehicle?: boolean = false;
}

// src/modules/incident/dto/create-witness.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class CreateWitnessDto {
  @ApiProperty({ example: 'John Anderson' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '(714) 555-0123' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'john.anderson@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '123 Main St, Newport Beach, CA 92660' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Independent Witness' })
  @IsNotEmpty()
  @IsString()
  relationship: string;

  @ApiProperty({ example: 'Witnessed the defendant run the red light...' })
  @IsNotEmpty()
  @IsString()
  statement: string;
}

// src/modules/incident/dto/create-evidence.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { EvidenceType, EvidenceStatus } from '@prisma/client';

export class CreateEvidenceDto {
  @ApiProperty({ enum: EvidenceType, example: EvidenceType.PHOTO })
  @IsEnum(EvidenceType)
  type: EvidenceType;

  @ApiProperty({ example: 'Accident scene photos showing vehicle damage' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 'Intersection of Newport Center Dr and Campus Dr' })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ example: 'Officer James Wilson' })
  @IsNotEmpty()
  @IsString()
  collectedBy: string;

  @ApiProperty({ example: '2015-09-20' })
  @IsNotEmpty()
  @IsDateString()
  dateCollected: string;

  @ApiPropertyOptional({ enum: EvidenceStatus, example: EvidenceStatus.COLLECTED })
  @IsOptional()
  @IsEnum(EvidenceStatus)
  status?: EvidenceStatus = EvidenceStatus.COLLECTED;

  @ApiPropertyOptional({ example: '/uploads/evidence/accident-scene-001.jpg' })
  @IsOptional()
  @IsString()
  filePath?: string;
}