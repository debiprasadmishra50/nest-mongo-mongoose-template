import { ApiProperty } from "@nestjs/swagger";

/**
 * CSRF Token Response DTO
 * Returned when the frontend bootstraps the cross-site CSRF flow
 */
export class CsrfTokenResponseDto {
  @ApiProperty({
    description: "CSRF token that the frontend must echo in the X-CSRF-Token header",
    example: "zLQ4CH2P-6iS3xGBM7JcRzFmlkF5P6EX0uTk",
  })
  csrfToken: string;
}
