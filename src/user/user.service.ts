import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MailService } from "../mail/mail.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "../user/entities/user.schema";
import { InjectLogger } from "../shared/decorators/logger.decorator";

/**
 * This service contain contains methods and business logic related to user.
 */
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectLogger() private readonly logger: Logger,
    private readonly mailService: MailService,
  ) {}
  async getAllUsers(): Promise<User[]> {
    const users = await this.userModel.find().exec();

    return users;
  }

  /**
   * it updates the user information as per provided information.
   * @param updateUserDto user information that needs to be updated.
   * @param user user information of current logged in user.
   * @returns updated user information
   */
  async updateUserData(updateUserDto: UpdateUserDto, user: User) {
    const { firstName, lastName } = updateUserDto;

    this.logger.log(`Checking if user exists with ID: ${user.id}`, "UserService");
    const currentUser = await this.userModel.findOne({ id: user.id });

    if (!currentUser) {
      this.logger.error(`User with ID ${user.id} not found`, "UserService");
      throw new NotFoundException("User Not Found");
    }

    let updated = false;

    if (firstName && currentUser.firstName !== firstName) {
      currentUser.firstName = firstName;
      updated = true;
    }

    if (lastName && currentUser.lastName !== lastName) {
      currentUser.lastName = lastName;
      updated = true;
    }

    if (!updated) {
      this.logger.log(`No changes detected for user ID: ${user.id}`, "UserService");
      return currentUser;
    }

    this.logger.log(`Saving updated user with ID: ${user.id}`, "UserService");
    await currentUser.save();

    this.logger.log("Sending update confirmation mail", "UserService");
    await this.mailService.sendConfirmationOnUpdatingUser(currentUser);

    return currentUser;
  }
}
