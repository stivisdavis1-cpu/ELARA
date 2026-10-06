import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Libellés exacts des options du sélecteur « Formule visée » de la landing. */
export const FORMULES_DEMO = [
  'Freemium (0 F)',
  'Starter (9 900 F/mois)',
  'Pro (24 900 F/mois)',
  'Business (54 900 F/mois)',
  'Cabinet comptable / Déploiement groupé',
] as const;

/**
 * Inscription à la liste d'attente.
 *
 * `site_web` est un pot de miel (honeypot) : champ masqué dans le formulaire,
 * jamais rempli par un humain, mais déclaré ici car la ValidationPipe rejette
 * tout champ non déclaré. `MaxLength(0)` accepte donc uniquement une valeur
 * vide — un robot qui renseigne le champ reçoit un 400 sans jamais atteindre
 * la base.
 */
export class InscriptionListeAttenteDto {
  @ApiProperty({ description: 'Prénom du visiteur', example: 'Amina', maxLength: 80 })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire.' })
  @MaxLength(80, { message: 'Le prénom est trop long (80 caractères maximum).' })
  prenom!: string;

  @ApiProperty({
    description: 'Adresse e-mail (normalisée en minuscules avant écriture)',
    example: 'amina@exemple.cm',
    maxLength: 254,
  })
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254, { message: "L'adresse e-mail est trop longue." })
  email!: string;

  @ApiPropertyOptional({ description: "Nom de l'entreprise (facultatif)", maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: "Le nom d'entreprise est trop long." })
  entreprise?: string;

  @ApiPropertyOptional({ description: "Code de parrainage de l'invitation utilisée", maxLength: 40 })
  @IsOptional()
  @IsString()
  // Volontairement souple : un code falsifié doit produire l'indicateur
  // `parrain_inconnu`, pas bloquer l'inscription du visiteur de bonne foi.
  @MaxLength(40, { message: 'Code de parrainage invalide.' })
  parrain?: string;

  /**
   * Pot de miel — volontairement absent de Swagger : aucun intérêt
   * documentatif pour un humain, et les robots ne lisent pas la doc.
   * Les décorateurs class-validator suffisent à le faire valider.
   */
  @IsOptional()
  @IsString()
  @MaxLength(0, { message: 'Formulaire invalide.' })
  site_web?: string;
}

/** Formulaire « Demander ma démo » de la landing. */
export class DemandeDemoDto {
  @ApiProperty({ description: 'Prénom', example: 'Amina', maxLength: 80 })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire.' })
  @MaxLength(80)
  prenom!: string;

  @ApiProperty({ description: 'Nom', example: 'Ngono', maxLength: 80 })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @MaxLength(80)
  nom!: string;

  @ApiProperty({ description: 'Adresse e-mail professionnelle', example: 'amina@exemple.cm', maxLength: 254 })
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ description: 'Téléphone (WhatsApp ou appel)', example: '+237 6 00 00 00 00', maxLength: 40 })
  @IsString()
  @IsNotEmpty({ message: 'Le téléphone est obligatoire.' })
  @MaxLength(40, { message: 'Le numéro de téléphone est trop long.' })
  telephone!: string;

  @ApiProperty({ description: "Nom de l'entreprise", example: 'Sanaga Distribution', maxLength: 120 })
  @IsString()
  @IsNotEmpty({ message: "Le nom de l'entreprise est obligatoire." })
  @MaxLength(120)
  entreprise!: string;

  @ApiProperty({ description: 'Formule visée', enum: FORMULES_DEMO })
  @IsIn(FORMULES_DEMO as unknown as string[], {
    message: `La formule doit être l'une des suivantes : ${FORMULES_DEMO.join(', ')}`,
  })
  formule!: string;

  @ApiPropertyOptional({ description: "Un mot sur l'activité (facultatif)", maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Le message est trop long (2000 caractères maximum).' })
  message?: string;

  /** Pot de miel — absent de Swagger (voir la note du premier DTO). */
  @IsOptional()
  @IsString()
  @MaxLength(0, { message: 'Formulaire invalide.' })
  site_web?: string;
}