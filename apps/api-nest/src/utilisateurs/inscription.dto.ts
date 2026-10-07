import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Inscription autonome — CONTRAT FERMÉ.
 *
 * Le client ne fournit qu'une identité + une entreprise à créer. Surtout, il
 * ne choisit NI son rôle NI son identifiant NI son tenant : tout champ
 * supplémentaire est rejeté (`forbidNonWhitelisted` global), interdisant
 * l'élévation de privilège par ajout de `role: 'admin_compte'` au JSON.
 */
export class InscriptionDto {
  @ApiProperty({ description: 'Adresse e-mail du responsable', maxLength: 254 })
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ description: 'Mot de passe (10 caractères minimum)', minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10, { message: 'Le mot de passe doit contenir au moins 10 caractères.' })
  @MaxLength(128)
  mot_de_passe!: string;

  @ApiProperty({ description: 'Nom du responsable', maxLength: 120 })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du responsable est obligatoire.' })
  @MaxLength(120)
  nom!: string;

  @ApiProperty({ description: 'Prénom du responsable', maxLength: 120 })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom du responsable est obligatoire.' })
  @MaxLength(120)
  prenom!: string;

  @ApiProperty({ description: "Raison sociale de l'entreprise à créer", maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: 'La raison sociale est obligatoire.' })
  @MaxLength(200)
  raison_sociale!: string;

  @ApiPropertyOptional({ description: 'Devise ISO à 3 lettres (défaut XAF)', example: 'XAF' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'La devise doit être un code ISO à 3 lettres (XAF, EUR…).' })
  devise?: string;

  @ApiPropertyOptional({
    description: 'Référentiel comptable (défaut SYSCOHADA)',
    enum: ['SYSCOHADA', 'PCG', 'IFRS', 'AUTRE'],
  })
  @IsOptional()
  @IsIn(['SYSCOHADA', 'PCG', 'IFRS', 'AUTRE'], {
    message: 'Système comptable invalide. Attendu : SYSCOHADA, PCG, IFRS, AUTRE.',
  })
  systeme_comptable?: 'SYSCOHADA' | 'PCG' | 'IFRS' | 'AUTRE';
}
