import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Senha precisa ter pelo menos 6 caracteres' })
  password!: string;
}

export class RegisterDto {
  // dados da loja / tenant
  @IsString()
  @MinLength(2)
  storeName!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // endereço de coleta padrão
  @IsString()
  pickupStreet!: string;

  @IsString()
  pickupNumber!: string;

  @IsOptional()
  @IsString()
  pickupComplement?: string;

  @IsString()
  pickupCity!: string;

  @IsString()
  pickupState!: string;

  @IsString()
  pickupZip!: string;
}
