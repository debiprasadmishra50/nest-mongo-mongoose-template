import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { User as UserDoc, UserSchema } from "src/user/entities/user.schema";
import { MongooseModule } from "@nestjs/mongoose";

/**
 * It is a feature module where we keep the controller, service and other code related to user entity and  we import other modules and configure modules and packages that are being used in this module.
 *
 * Here, feature modules imported are -  DatabaseModule, AuthModule, MailModule and UserModule.
 * other modules are :
 *      TypeOrmModule - it is an ORM and enables easy access to database.
 */
@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: UserDoc.name, schema: UserSchema }]), MailModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [],
})
export class UserModule {}
