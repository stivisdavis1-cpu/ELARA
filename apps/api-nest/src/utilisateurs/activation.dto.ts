import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ActivationDto {
  @ApiProperty({
    description: 'Mot de passe choisi pour le compte',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
  @MaxLength(128, { message: 'Le mot de passe est trop long' })
  mot_de_passe!: string;

  @ApiProperty({
    description: 'Confirmation du mot de passe (doit être identique au champ mot_de_passe)',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
  @MaxLength(128, { message: 'Le mot de passe est trop long' })
  confirmation!: string;
}
