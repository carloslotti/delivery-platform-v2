import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DriverStatus, VehicleType } from '@prisma/client';

export class CreateDriverDto {
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() cnh?: string;
  @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @IsOptional() @IsString() vehiclePlate?: string;
  @IsOptional() @IsString() pixKey?: string;
}

export class UpdateDriverDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() cnh?: string;
  @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @IsOptional() @IsString() vehiclePlate?: string;
  @IsOptional() @IsString() pixKey?: string;
  @IsOptional() @IsEnum(DriverStatus) status?: DriverStatus;
}

export class UpdateLocationDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
  @IsOptional() @IsNumber() speed?: number;
  @IsOptional() @IsNumber() heading?: number;
}
