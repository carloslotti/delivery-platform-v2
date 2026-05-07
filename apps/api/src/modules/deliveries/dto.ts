import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { PackageType, DeliveryStatus } from '@prisma/client';

export class CreateDeliveryDto {
  @IsString()
  storeId!: string;

  @IsOptional()
  @IsString()
  externalRef?: string;

  // entrega
  @IsString()
  dropoffStreet!: string;

  @IsString()
  dropoffNumber!: string;

  @IsOptional()
  @IsString()
  dropoffComplement?: string;

  @IsOptional()
  @IsString()
  dropoffNeighborhood?: string;

  @IsString()
  dropoffCity!: string;

  @IsString()
  @Length(2, 2)
  dropoffState!: string;

  @IsOptional()
  @IsString()
  dropoffZip?: string;

  @IsOptional()
  @IsNumber()
  dropoffLat?: number;

  @IsOptional()
  @IsNumber()
  dropoffLng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  dropoffNotes?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsEnum(PackageType)
  packageType?: PackageType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packageValueCents?: number;

  @IsOptional()
  @IsBoolean()
  requiresProof?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresReturn?: boolean;
}

export class UpdateDeliveryStatusDto {
  @IsEnum(DeliveryStatus)
  status!: DeliveryStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignDriverDto {
  @IsString()
  driverId!: string;
}

export class ListDeliveriesDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number;
}
