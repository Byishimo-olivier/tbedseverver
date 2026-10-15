import mongoose, { Schema, Document } from "mongoose";

export interface ICounter extends Document {
  _id: string;
  sequence_value: number;
}

const counterSchema = new Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 },
});

export const Counter = mongoose.model<ICounter>("Counter", counterSchema);
