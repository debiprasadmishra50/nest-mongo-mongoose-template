import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MailService } from "../mail/mail.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtPayload } from "./dto/jwt-payload.dto";
import { LoginUserDto } from "./dto/login-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateMyPasswordDto } from "./dto/update-password.dto";
import { User, UserDocument } from "../user/entities/user.schema";
import { argon2hash, argon2verify } from "../utils/hashes/argon2";
import { sha256, tokenCreate } from "../utils/hashes/hash";
import { InjectLogger } from "../shared/decorators/logger.decorator";

/**
 * This service contain contains all methods and business logic for authentication such as login, signup, password reset, etc.
 */
@Injectable()
export class AuthService {
  private _FR_HOST: string;

  /**
   *  returns the frontend host URL.
   */
  public get FR_HOST(): string {
    return this._FR_HOST;
  }

  /**
   *  used to set the frontend host URL.
   *  @param value the URL to the frontend host.
   */
  public set FR_HOST(value: string) {
    this._FR_HOST = value;
  }

  /**
   * Constructor of `AuthService` class
   * @param userRepository
   * @param jwtService imported from "@nestjs/jwt"
   * @param mailService
   * @param configService
   */
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @InjectLogger() private readonly logger: Logger
  ) {
    this.FR_HOST = configService.get<string>(`FR_BASE_URL`);
  }

  /**
   * used for signing up the user and send mail with activation token to the given email for account activation.
   * @param createUserDto object containing user information.
   * @param req HTTP request object.
   * @returns user object containing information about user and token which is used for authentication.
   */
  async signup(createUserDto: CreateUserDto, req: Request): Promise<{ user: User; token: string }> {
    this.logger.log("Create and Save user", "AuthService");

    let { password } = createUserDto;

    password = await argon2hash(password); // NOTE: Hash the password

    try {
      // NOTE: Generate user activating token
      const originalToken: string = tokenCreate();
      const hashedToken: string = sha256(originalToken);

      const user = await this.userModel.create({ ...createUserDto, password, activeToken: hashedToken });

      this.logger.log(`User Created, Email: ${user.email}`, "AuthService");

      this.logger.log("Login the user and send the token and mail", "AuthService");
      const token: string = await this.signTokenSendEmailAndSMS(user, req, originalToken);

      return { user, token };
    } catch (err) {
      this.logger.error(err.message, err.stack, "AuthService");
      if (err.code === "23505") throw new ConflictException("Email already exists");
      else throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * used for user account activation by comparing the given token with activeToken hash in user object.
   * @param token activation token that is sent to the user during signup.
   * @returns true | false
   */
  async activateAccount(token: string) {
    this.logger.log("Generating token", "AuthService");
    const hashedToken = sha256(token);

    this.logger.log("Searching User with activation token", "AuthService");
    const user = await this.userModel.findOne({ where: { activeToken: hashedToken } });

    if (!user) throw new BadRequestException("Invalid token or token expired");

    this.logger.log("Activate Account", "AuthService");
    user.active = true;
    user.activeToken = null;

    await user.save();

    //NOTE: FOR UI
    const profile = `${this.FR_HOST}/accounts/profile`;

    this.logger.log("Send account activation mail to user", "AuthService");
    this.mailService.sendUserAccountActivationMail(user, profile);

    return true;
  }

  /**
   * used by passport for authentication by finding the user and matching password.
   * @param loginUserDto object containing email and phone of a user.
   * @returns if authenticated it returns user object otherwise returns null
   */
  async loginPassport(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    this.logger.log("Searching User with provided email", "AuthService");
    const user = await this.userModel.findOne({ email });

    this.logger.log("Verifying User", "AuthService");
    if (user && (await argon2verify(user.password, password))) {
      return user;
    }

    return null;
  }

  /**
   * used by passport for google authentication.
   * @param req http request object containing user details provided by google.
   * @returns user object containing information about user and token which is used for authentication.
   */
  async loginGoogle(req: Request) {
    if (!req.user) {
      throw new NotFoundException("User Not Found");
    }

    const { existingUser, sendMail, newUser, activateToken } = await this.createOrFindUserGoogle(
      req.user as User
    );

    let user: User, token: string;
    user = existingUser ?? newUser;

    if (sendMail) {
      token = await this.signTokenSendEmailAndSMS(user, req, activateToken);
    } else {
      this.logger.log("Existing User, Logging In", "AuthService");
      token = await this.signToken(user);
    }

    return {
      user,
      token,
    };
  }

  /**
   * sends password reset token to given email for resetting password if user account associated to that email is found.
   * @param email email associated with user account
   * @param req HTTP request object.
   * @returns signed token which is used for authentication.
   */
  async forgotPassword(email: string, req: Request) {
    this.logger.log("Searching User with provided email", "AuthService");
    const user = await this.userModel.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException("User Not Found");
    }

    this.logger.log("Creating password reset token", "AuthService");
    const { updatedUser, resetToken } = this.createPasswordResetToken(user);

    try {
      await updatedUser.save();

      const resetURL = `${req.protocol}://${req.get("host")}/api/v1/auth/reset-password/${resetToken}`;
      //NOTE: FOR UI
      // const resetURL = `${req.protocol}://${req.get("host")}/resetPassword/${resetToken}`;
      // const resetURL = `${thcreateOrFindUserGoogleis.FR_HOST}/auth/reset-password/${resetToken}`;

      this.logger.log("Sending password reset token mail", "AuthService");
      this.mailService.sendForgotPasswordMail(email, resetURL);

      return true;
    } catch (err) {
      user.passwordResetToken = null;
      user.passwordResetExpires = null;

      await user.save();
      return false;
    }
  }

  /**
   * verifies the given password rest token by comparing it with token stored in user object and making sure it's not expired.
   * @param token password reset token that is sent over the mail to the user in forgotPassword.
   * @returns a string "valid token" if the token is valid.
   */
  async verifyToken(token: string) {
    this.logger.log("Generating hash from token", "AuthService");
    const hashedToken = sha256(token);

    this.logger.log("Retrieving user", "AuthService");
    const user: User = await this.userModel.findOne({ where: { passwordResetToken: hashedToken } });

    if (!user) throw new BadRequestException("The user belonging to this token doesn't exist");

    this.logger.log("Checking if token is valid", "AuthService");
    const resetTime: number = +user.passwordResetExpires;
    if (Date.now() >= resetTime) {
      throw new BadRequestException("Invalid token or token expired");
    }

    return "valid token";
  }

  /**
   * used to reset user password. it verifies the given password reset token and if verified updates the user password.
   * @param token password reset token that is sent over the mail to the user in forgotPassword.
   * @param resetPassword contains new password to be set.
   * @returns a string "valid token" if the token is valid.
   */
  async resetPassword(token: string, resetPassword: ResetPasswordDto) {
    const { password, passwordConfirm } = resetPassword;

    this.logger.log("Checking Password equality", "AuthService");
    if (password !== passwordConfirm) {
      throw new NotAcceptableException("password and passwordConfirm should match");
    }

    this.logger.log("Generating hash from token", "AuthService");
    const hashedToken = sha256(token);

    this.logger.log("Retrieving user", "AuthService");
    const user = await this.userModel.findOne({ where: { passwordResetToken: hashedToken } });

    if (!user) throw new BadRequestException("Invalid token or token expired");

    this.logger.log("Checking if token is valid", "AuthService");
    const resetTime: number = +user.passwordResetExpires;
    if (Date.now() >= resetTime) {
      throw new BadRequestException("Invalid token or token expired");
    }

    this.logger.log("Hashing the password", "AuthService");
    user.password = await argon2hash(password);

    user.passwordResetExpires = null;
    user.passwordResetToken = null;

    this.logger.log("Update the user password", "AuthService");
    const updatedUser = await user.save();

    const newToken: string = await this.signToken(updatedUser);

    this.logger.log("Sending reset password confirmation mail", "AuthService");
    this.mailService.sendPasswordResetConfirmationMail(user);

    return { updatedUser, newToken };
  }

  /**
   * used to update user password. it verifies the current user password and update the new password.
   * @param updateMyPassword password reset token that is sent over the mail to the user in forgotPassword.
   * @param user user object containg user information of current logged in user.
   * @returns updated user object containing user information and token which is used for authentication.
   */
  async updateMyPassword(updateMyPassword: UpdateMyPasswordDto, user: User) {
    const { passwordCurrent, password, passwordConfirm } = updateMyPassword;

    this.logger.log("Verifying current password from user", "AuthService");
    if (!(await argon2verify(user.password, passwordCurrent))) {
      throw new UnauthorizedException("Invalid password");
    }

    if (password === passwordCurrent) {
      throw new BadRequestException("New password and old password can not be same");
    }

    if (password !== passwordConfirm) {
      throw new BadRequestException("Password does not match with passwordConfirm");
    }

    this.logger.log("Masking Password", "AuthService");
    const hashedPassword = await argon2hash(password);
    user.password = hashedPassword;

    this.logger.log("Saving Updated User", "AuthService");
    await this.userModel.findOneAndUpdate({ id: user.id }, user);

    this.logger.log("Sending password update mail", "AuthService");
    this.mailService.sendPasswordUpdateEmail(user);

    this.logger.log("Login the user and send the token again", "AuthService");
    const token: string = await this.signToken(user);

    return { user, token };
  }

  /**
   * used for deleting user account. Method implementation to be completed by developer.
   * @param user user object containg user information of current logged in user.
   * @returns updated user object containing user information and token which is used for authentication.
   */
  async deleteMyAccount(user: User): Promise<boolean> {
    // TODO: Method to be implemented by developer
    throw new BadRequestException("Method not implemented.");
  }

  /**
   * sends account activation URL in a mail to the logged in user.
   * @param user user object containg user information of current logged in user.
   * @param req HTTP request object.
   * @returns updated user object containing user information and token which is used for authentication.
   */
  async sendAccountActivationMail(user: User, req: Request) {
    this.logger.log("Creating token", "AuthService");
    const activateToken: string = tokenCreate();

    this.logger.log("Generating and saving token hash", "AuthService");
    user.activeToken = sha256(activateToken);

    await this.userModel.findOneAndUpdate({ id: user.id }, user);

    this.logger.log("Creating activation url", "AuthService");
    const activeURL = `${req.protocol}://${req.get("host")}/api/v1/auth/activate/${activateToken}`;
    //NOTE: FOR UI
    // const activeURL = `${req.protocol}://${req.get("host")}/activate/${activateToken}`;
    // const activeURL = `${this.FR_HOST}/auth/activate/${activateToken}`;

    this.logger.log("Sending activtion mail", "AuthService");
    this.mailService.sendUserActivationToken(user, activeURL);

    return true;
  }

  /**
   * used for signing a JWT token with user id as payload.
   * @param user http request object containing user details provided by google.
   * @returns signed token which is used for authentication.
   */
  async signToken(user: any): Promise<string> {
    const payload: JwtPayload = { id: user.id };
    this.logger.log("Signing token", "AuthService");

    return this.jwtService.sign(payload);
  }

  /**
   * sends account activation URL in a welcome mail to the given user.
   * @param user user object containg user information.
   * @param activateToken account activation token.
   * @param req HTTP request object.
   * @returns signed JWT token which is used for authentication.
   */
  private async signTokenSendEmailAndSMS(user: User, req: Request, activateToken: string) {
    const token: string = await this.signToken(user);

    const activeURL = `${req.protocol}://${req.get("host")}/api/v1/auth/activate/${activateToken}`;
    //NOTE: FOR UI
    // const activeURL = `${req.protocol}://${req.get("host")}/activate/${activateToken}`;
    // const activeURL = `${this.FR_HOST}/auth/activate/${activateToken}`;

    this.logger.log("Sending welcome email", "AuthService");
    this.mailService.sendUserConfirmationMail(user, activeURL);

    // TODO: Send confirmation SMS to new user using Twilio

    return token;
  }

  /**
   * it creates password reset token and saves it in user object.
   * @param curUser user object containing user information.
   * @returns created password reset token.
   */
  private createPasswordResetToken(curUser: UserDocument): {
    updatedUser: UserDocument;
    resetToken: string;
  } {
    const resetToken: string = tokenCreate();

    curUser.passwordResetToken = sha256(resetToken);

    const timestamp = Date.now() + 10 * 60 * 1000; // NOTE: 10 mins to reset password
    curUser.passwordResetExpires = timestamp.toString();

    return { updatedUser: curUser, resetToken };
  }

  /**
   * it checks for user in DB and if not found, creates and saves new user object in database. it is used for google authentication
   * @param user user information provided by google.
   * @returns newly created user object and activation token
   */
  private async createOrFindUserGoogle(user: User) {
    const existingUser = await this.userModel.findOne({ where: { googleID: user.id } });

    if (existingUser) return { existingUser, sendMail: false };

    const activateToken: string = tokenCreate();

    try {
      const newUser = new this.userModel({
        googleID: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        activeToken: sha256(activateToken),
      });
      await newUser.save();

      return { newUser, activateToken, sendMail: true };
    } catch (err) {
      if (err.code === "23505") throw new ConflictException("User already exists");
      else throw new InternalServerErrorException();
    }
  }
}
