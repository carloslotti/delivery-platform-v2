import { IsBoolean, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateStoreDto {
  @IsString() name!: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsString() pickupStreet!: string;
  @IsString() pickupNumber!: string;
  @IsOptional() @IsString() pickupComplement?: string;
  @IsOptional() @IsString() pickupNeighborhood?: string;
  @IsString() pickupCity!: string;
  @IsString() @Length(2, 2) pickupState!: string;
  @IsString() pickupZip!: string;
  @IsOptional() @IsNumber() pickupLat?: number;
  @IsOptional() @IsNumber() pickupLng?: number;
}

export class UpdateStoreDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() pickupStreet?: string;
  @IsOptional() @IsString() pickupNumber?: string;
  @IsOptional() @IsString() pickupComplement?: string;
  @IsOptional() @IsString() pickupNeighborhood?: string;
  @IsOptional() @IsString() pickupCity?: string;
  @IsOptional() @IsString() @Length(2, 2) pickupState?: string;
  @IsOptional() @IsString() pickupZip?: string;
  @IsOptional() @IsNumber() pickupLat?: number;
  @IsOptional() @IsNumber() pickupLng?: number;
  @IsOptional() @IsBoolean() isOpen?: boolean;
  @IsOptional() @IsNumber() @Min(0) baseDeliveryPriceCents?: number;
  @IsOptional() @IsNumber() @Min(0) driverPayoutCents?: number;
  @IsOptional() @IsNumber() @Min(0) pricePerKmCents?: number;
  @IsOptional() @IsNumber() @Min(0) freeDistanceKm?: number;
}
