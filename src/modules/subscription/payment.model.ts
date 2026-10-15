import mongoose, { Schema, Document } from 'mongoose';
import { PlanId } from '@/config/plans';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentProvider {
  MOMO = 'momo',
  STRIPE = 'stripe',
  PESAPAL = 'pesapal',
  MANUAL = 'manual',
}

export interface IPayment extends Document {
  userId?: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  planId: PlanId;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerReferenceId: string;
  providerTransactionId?: string;
  providerOrderTrackingId?: string; // For Pesapal
  status: PaymentStatus;
  phoneNumber?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    planId: {
      type: String,
      enum: Object.values(PlanId),
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'RWF' },
    provider: {
      type: String,
      enum: Object.values(PaymentProvider),
      required: true,
    },
    providerReferenceId: { type: String, required: true, unique: true },
    providerTransactionId: { type: String },
    providerOrderTrackingId: { type: String },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    phoneNumber: { type: String, required: false },
    failureReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
paymentSchema.index({ providerReferenceId: 1 });
paymentSchema.index({ providerOrderTrackingId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ companyId: 1, status: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);