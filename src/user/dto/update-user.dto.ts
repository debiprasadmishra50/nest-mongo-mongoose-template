import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsAlpha, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { IsNotAdmin } from "../../shared/decorators/not-admin.decorator";

/**
 * request DTO with validations for updateUserDetails API.
 */
export class UpdateUserDto {
  /**
   * firstName of user
   */
  @IsNotAdmin()
  @IsAlpha()
  @MaxLength(20, { message: "First Name exceeds given length" })
  @MinLength(1, { message: "First name has to be of length 1" })
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  firstName?: string;

  /**
   * lastName of user
   */
  @IsNotAdmin()
  @IsAlpha()
  @MaxLength(20, { message: "First Name exceeds given length" })
  @MinLength(1, { message: "First name has to be of length 1" })
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  lastName?: string;
}
