import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
 * `@IsOptional()` ne neutralise la validation que pour `null`/`undefined` —
 * pas pour `""`. Or le formulaire envoie `secteur: ""` (« Non précisé ») et
 * laisse facilement `pays`/`ville`/`devise` vides : sans cette transformation,
 * une valeur vide tomberait sur `@Matches` et produirait un 400 injustifié.
 * On convertit donc `""` en `undefined` AVANT validation.
 */
const videVersUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Alphabet d'affichage (prénoms, raisons sociales, pays, villes) : lettres
 * Unicode, espaces et ponctuation courante — jamais de chevrons, jamais de
 * point-virgule. Même règle que la landing : un `<script>` dans un nom
 * reçoit un 400 AVANT la base, au lieu d'être stocké puis restitué par une
 * page d'administration (XSS stocké).
 */
const ALPHABET_AFFICHAGE = /^[\p{L}\p{M}0-9 .,'’\-()]+$/u;

/** Idem, esperluette admise : l'option « BTP & construction » en contient une. */
const ALPHABET_SECTEUR = /^[\p{L}\p{M}0-9 .,'’&\-()]+$/u;

/**
 * Inscription autonome — CONTRAT FERMÉ.
 *
 * Le client ne fournit qu'une identité + une entreprise à créer. Surtout, il
 * ne choisit NI son rôle NI son identifiant NI son tenant : tout champ
 * supplémentaire est rejeté (`forbidNonWhitelisted` global), interdisant
 * l'élévation de privilège par ajout de `role: 'admin_compte'` au JSON.
 *
 * `pays`, `ville` et `secteur` SONT déclarés (optionnels) : le formulaire
 * `/register` les envoie, et un champ non déclaré y produisait un 400 à
 * chaque inscription depuis l'ajout du DTO fermé.
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
  @Matches(ALPHABET_AFFICHAGE, { message: 'Le nom contient des caractères interdits.' })
  nom!: string;

  @ApiProperty({ description: 'Prénom du responsable', maxLength: 120 })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom du responsable est obligatoire.' })
  @MaxLength(120)
  @Matches(ALPHABET_AFFICHAGE, { message: 'Le prénom contient des caractères interdits.' })
  prenom!: string;

  @ApiProperty({ description: "Raison sociale de l'entreprise à créer", maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: 'La raison sociale est obligatoire.' })
  @MaxLength(200)
  @Matches(ALPHABET_AFFICHAGE, { message: 'La raison sociale contient des caractères interdits.' })
  raison_sociale!: string;

  @ApiPropertyOptional({ description: 'Pays (optionnel)', maxLength: 100, example: 'Cameroun' })
  @Transform(videVersUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le pays est trop long (100 caractères maximum).' })
  @Matches(ALPHABET_AFFICHAGE, { message: 'Le pays contient des caractères interdits.' })
  pays?: string;

  @ApiPropertyOptional({ description: 'Ville (optionnel)', maxLength: 100, example: 'Douala' })
  @Transform(videVersUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La ville est trop longue (100 caractères maximum).' })
  @Matches(ALPHABET_AFFICHAGE, { message: 'La ville contient des caractères interdits.' })
  ville?: string;

  @ApiPropertyOptional({ description: "Secteur d'activité (optionnel)", maxLength: 100, example: 'Commerce' })
  @Transform(videVersUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "Le secteur est trop long (100 caractères maximum)." })
  @Matches(ALPHABET_SECTEUR, { message: 'Le secteur contient des caractères interdits.' })
  secteur?: string;

  @ApiPropertyOptional({ description: 'Devise ISO à 3 lettres (défaut XAF)', example: 'XAF' })
  @Transform(videVersUndefined)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'La devise doit être un code ISO à 3 lettres (XAF, EUR…).' })
  devise?: string;

  @ApiPropertyOptional({
    description: 'Référentiel comptable (défaut SYSCOHADA)',
    enum: ['SYSCOHADA', 'PCG', 'IFRS', 'AUTRE'],
  })
  @Transform(videVersUndefined)
  @IsOptional()
  @IsIn(['SYSCOHADA', 'PCG', 'IFRS', 'AUTRE'], {
    message: 'Système comptable invalide. Attendu : SYSCOHADA, PCG, IFRS, AUTRE.',
  })
  systeme_comptable?: 'SYSCOHADA' | 'PCG' | 'IFRS' | 'AUTRE';
}
