import { Controller, Get, Header, HttpCode, HttpStatus, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Public } from "../shared/decorators/public.decorator";
import { ApiSuccessResponse } from "../shared/decorators/swagger-generic-response.decorator";
import { ApiResponseDto } from "../shared/dto/base-response.dto";
import { CsrfTokenResponseDto } from "./dto-response/csrf-response.dto";

interface RequestWithCsrfToken extends Request {
  csrfToken(): string;
}

@ApiTags("CSRF")
@Controller("csrf-token")
export class CsrfController {
  /**
   * Issues a CSRF token for browser clients before they perform mutating cross-site requests.
   * The csurf middleware ties this token to the httpOnly secret cookie that it manages internally.
   *
   * @param req - Express request extended by csurf with csrfToken()
   * @returns Standard success response containing the generated CSRF token
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  @Header("Pragma", "no-cache")
  @ApiOperation({ summary: "Issue a CSRF token for cross-site browser requests" })
  @ApiSuccessResponse(CsrfTokenResponseDto, "CSRF token issued successfully")
  getCsrfToken(@Req() req: RequestWithCsrfToken): ApiResponseDto<CsrfTokenResponseDto> {
    // Generate a token bound to the secret stored in the httpOnly CSRF cookie.
    const csrfToken = req.csrfToken();

    return {
      status: "success",
      data: { csrfToken },
    };
  }
}
