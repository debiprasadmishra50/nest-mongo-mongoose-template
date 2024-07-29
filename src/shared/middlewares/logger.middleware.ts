import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

/**
 * LoggerMiddleware add logs for each incoming request
 * @category Core
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger("HTTP", { timestamp: true });

  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get("user-agent") || "";
    const start = Date.now();

    res.on("finish", () => {
      const { statusCode } = res;
      const contentLength = res.get("content-length");
      const end = Date.now();

      if (statusCode.toString().match(/(5|4)/))
        this.logger.error(
          `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip} - ${end - start}ms`,
        );
      else
        this.logger.log(
          `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip} - ${end - start}ms`,
        );
    });

    next();
  }
}
