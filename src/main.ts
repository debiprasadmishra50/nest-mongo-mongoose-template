import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import csurf from "csurf";
import xssClean from "xss-clean";
import hpp from "hpp";
import { json, urlencoded } from "express";
import { ConfigService } from "@nestjs/config";
import mongoSanitize from "express-mongo-sanitize";

import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";

/**
 * function for bootstraping the nest application
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
    logger: ["error", "fatal", "log", "verbose", "warn", "debug"],
  });
  const configService = app.get<ConfigService>(ConfigService);

  app.setGlobalPrefix("/api");
  app.enableVersioning({
    defaultVersion: "1",
    type: VersioningType.URI,
  });

  app.enableCors();
  app.use(cookieParser());
  app.use(compression());

  app.use(mongoSanitize());

  app.use(json({ limit: "50kb" }));
  app.use(urlencoded({ extended: true, limit: "50kb" }));

  app.disable("x-powered-by"); // provide an extra layer of obsecurity to reduce server fingerprinting.
  app.set("trust proxy", 1); // trust first proxy

  const ignoreMethods =
    configService.get<string>("STAGE") == "dev"
      ? ["GET", "HEAD", "OPTIONS", "DELETE", "POST", "PATCH", "PUT"] // for devlopment we ignoring all
      : ["GET", "HEAD", "OPTIONS", "DELETE"];
  app.use(
    csurf({
      cookie: { httpOnly: true, secure: true },
      ignoreMethods,
    }),
  );
  app.use(
    helmet({
      hsts: {
        includeSubDomains: true,
        preload: true,
        maxAge: 63072000, // 2 years in seconds
      },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'", "https://polyfill.io", "https://*.cloudflare.com", "http://127.0.0.1:3000/"],
          baseUri: ["'self'"],
          scriptSrc: [
            "'self'",
            "http://127.0.0.1:3000/",
            "https://*.cloudflare.com",
            "https://polyfill.io",
            `https: 'unsafe-inline'`,
          ],
          styleSrc: ["'self'", "https:", "http:", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:", "validator.swagger.io"],
          fontSrc: ["'self'", "https:", "data:"],
          childSrc: ["'self'", "blob:"],
          styleSrcAttr: ["'self'", "'unsafe-inline'", "http:"],
          frameSrc: ["'self'"],
        },
      },
      dnsPrefetchControl: { allow: false }, // Changed based on the last middleware to disable DNS prefetching
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "no-referrer" },
      xssFilter: true,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      crossOriginResourcePolicy: { policy: "same-site" },
      originAgentCluster: true,
    }),
  );

  app.use((req: any, res: any, next: any) => {
    res.setHeader(
      "Permissions-Policy",
      'fullscreen=(self), camera=(), geolocation=(self "https://*example.com"), autoplay=(), payment=()',
    );
    next();
  });

  app.use(xssClean());
  app.use(hpp());

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  // app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  /* FIXME:
    ##########################
    ##### Set-up Swagger #####
    ##########################
  */
  if (!["prod", "production"].includes(configService.get<string>("STAGE").toLowerCase())) {
    const config = new DocumentBuilder()
      .addBearerAuth()
      .setTitle(configService.get<string>("npm_package_name").replaceAll("-", " ").toUpperCase())
      .setDescription("DESCRIPTION")
      .setVersion(configService.get<string>("npm_package_version"))
      .build();

    const document = SwaggerModule.createDocument(app, config, { ignoreGlobalPrefix: false });
    SwaggerModule.setup("api", app, document, {
      swaggerOptions: {
        tagsSorter: "alpha",
      },
    });
  }

  const port = configService.get<string>("PORT") || 3000;
  await app.listen(port, () => {
    console.log("[+] Server started on port: " + port);
  });
}
bootstrap();
