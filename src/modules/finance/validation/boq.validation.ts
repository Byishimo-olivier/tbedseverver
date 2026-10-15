import { BoQCategory, UnitOfMeasurement } from "@/types/enums";
import { z } from "zod";

const boqLineItemSchema = z.object({
  description: z.string().min(1),
  unit: z.nativeEnum(UnitOfMeasurement),
  quantity: z.number().min(0),
  rate: z.number().min(0),
});

const boqSectionSchema = z.object({
  sectionName: z.nativeEnum(BoQCategory),
  items: z.array(boqLineItemSchema).min(1),
});

export const createOrUpdateBoQSchema = z.object({
  body: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    sections: z.array(boqSectionSchema).min(1),
  }),
});