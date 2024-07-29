import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument } from "mongoose";
import { v4 as uuidv4 } from "uuid";

import { UserRoles } from "../enums/role.enum";

export type UserDocument = HydratedDocument<User>;

/**
 * Helper function to delete common properties.
 */
function transformCommon(doc: any, ret: any) {
  delete ret._id;
  delete ret.__v;
  delete ret.password;
  delete ret.googleID;
  delete ret.deleted;
  delete ret.deletedAt;
  delete ret.activeToken;
  delete ret.passwordResetToken;
  delete ret.passwordResetExpires;
  return ret;
}

/**
 * It describes the schema for user table in database.
 */
@Schema({
  // _id: false,
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: transformCommon,
  },
  toObject: {
    virtuals: true,
    transform: transformCommon,
  },
})
export class User {
  /**
   * auto-generated unique uuid primary key for the table.
   */
  @Prop({ type: String, default: uuidv4, index: true })
  @ApiProperty()
  id: string;

  /**
   * googleId of the user user for google auth.
   */
  @Prop({ type: String, default: null })
  @Exclude({ toPlainOnly: true })
  googleID: string;

  /**
   * firstName of user.
   */
  @Prop({ default: null })
  @ApiProperty()
  firstName: string;

  /**
   * lastName of user.
   */
  @Prop({ required: true })
  @ApiProperty()
  lastName: string;

  /**
   * email address of user.
   */
  @Prop({ unique: true, required: true, lowercase: true, trim: true, index: true })
  @ApiProperty()
  email: string;

  /**
   * hashed password of user.
   */
  @Prop({ default: null })
  @Exclude({ toPlainOnly: true })
  password: string;

  /**
   * password reset Token for password reset methods.
   */
  @Prop({ default: null })
  @Exclude({ toPlainOnly: true })
  passwordResetToken: string;

  /**
   * password reset token Expiration time .
   */
  @Prop({ default: null })
  @Exclude({ toPlainOnly: true })
  passwordResetExpires: string;

  /**
   * represents activation state of user.
   */
  @Prop({ default: false })
  @ApiProperty({ default: false })
  active: boolean;

  /**
   * account activation token for user.
   */
  @Prop({ default: null })
  @Exclude({ toPlainOnly: true })
  activeToken: string;

  /**
   * role of user. default is UserRoles.USER.
   */
  @Prop({ type: [String], enum: UserRoles, length: 1, default: [UserRoles.USER] })
  @ApiProperty({
    enum: UserRoles,
    default: [UserRoles.USER],
    description: `String array, containing enum values, either ${UserRoles.USER} or ${UserRoles.ADMIN}`,
  })
  roles: UserRoles[1]; // NOTE: You can change the size to assign multiple roles to a single user.

  /**
   * status to track the deletion status of user
   */
  @Prop({ default: false })
  @Exclude()
  deleted: boolean; // A flag to mark the user as deleted

  /**
   * timestamp for date of user soft-delete
   */
  @Prop({ default: null })
  @Exclude()
  deletedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);
