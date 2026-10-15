// src/modules/users/user.model.ts
import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";
import { MembershipTier } from "@/types/enums";
import { PlanId } from "@/config/plans";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  isEmailVerified: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  profilePicture?: string;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  contactNumber?: string;
  membershipTier?: MembershipTier;
  companies?: mongoose.Types.ObjectId[]; // References to companies the user belongs to
  plan: PlanId;
  subscriptionId?: string;
  subscriptionStatus: string;
  subscriptionStartDate?:Date;
  subscriptionEndDate?:Date;
  trialEndsAt:Date;
  role: string; // Global user role ('user', 'admin')
  isIndividual: boolean; // Is this an individual account or company-associated
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    profilePicture: {
      type: String,
      default: null,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    contactNumber: String,
    plan: {
      type: String,
      enum: Object.values(PlanId),
      default: PlanId.BASIC,
    },
    subscriptionId: {
      type: String,
      index: true,
      sparse: true,
    },
    subscriptionStatus: {
      type: String,
      default: "inactive",
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    trialEndsAt:{
      type:Date,
    },
    companies: [{ type: Schema.Types.ObjectId, ref: "Company" }],
    isIndividual: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
