import { Counter } from "@/modules/finance/models/counter.model";

export async function getNextSequenceValue(
  sequenceName: string
): Promise<number> {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.sequence_value;
}
