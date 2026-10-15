import { InvoiceStatus, InvoiceType, PaymentTerms } from "@/types/enums";
import { z } from "zod";

const boqInvoiceItemSchema = z.object({
  boqItemId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid BoQ Item ID"),
  claimedQuantity: z.number().min(0.01, "Claimed quantity must be positive"),
});

const serviceInvoiceItemSchema = z.object({
  description: z.string().min(1, "Service description is required"),
  quantity: z.number().min(0.01, "Service quantity must be positive"),
  unitPrice: z.number().min(0, "Service unit price must be non-negative"),
});

// Helpers to parse JSON sent as strings in multipart/form-data
const safeJson = (val: unknown) => {
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    // Fix: Try wrapping in brackets if it looks like a list of objects (e.g. "{...},{...}")
    if (val.trim().startsWith("{") && val.includes("}")) {
      try {
        return JSON.parse(`[${val}]`);
      } catch (e2) {
        return val;
      }
    }
    return val;
  }
};
const normalizeInvoiceType = (val: unknown) => {
  if (typeof val !== "string") return val;
  const key = val.toLowerCase().replace(/[\s-_]/g, "");
  if (key === "boqbased") return InvoiceType.BOQ_BASED;
  if (key === "servicebased") return InvoiceType.SERVICE_BASED;
  if (val === "BOQ_BASED") return InvoiceType.BOQ_BASED;
  if (val === "SERVICE_BASED") return InvoiceType.SERVICE_BASED;
  return val;
};

export const createInvoiceSchema = z.object({
  body: z
    .object({
      type: z.preprocess((v) => normalizeInvoiceType(v), z.nativeEnum(InvoiceType)),
      projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Project ID"),
      workPeriod: z.preprocess(
        (v) => safeJson(v),
        z.object({
          start: z.string().datetime(),
          end: z.string().datetime(),
        })
      ),
      invoiceItems: z.preprocess((v) => safeJson(v), z.array(z.any()).min(1, "At least one item must be included")),
      paymentTerms: z.nativeEnum(PaymentTerms),
      dueDate: z.string().datetime(),
      paymentDetails: z.preprocess(
        (v) => safeJson(v),
        z.object({
          bankName: z.string(),
          accountNumber: z.string(),
          accountName: z.string(),
        })
      ),
    })
    .superRefine((data, ctx) => {
      if (data.type === InvoiceType.BOQ_BASED) {
        const result = z.array(boqInvoiceItemSchema).safeParse(data.invoiceItems);
        if (!result.success) {
          result.error.issues.forEach((issue) =>
            ctx.addIssue({ ...issue, path: ["invoiceItems", ...issue.path] })
          );
        }
      } else if (data.type === InvoiceType.SERVICE_BASED) {
        const result = z.array(serviceInvoiceItemSchema).safeParse(data.invoiceItems);
        if (!result.success) {
          result.error.issues.forEach((issue) =>
            ctx.addIssue({ ...issue, path: ["invoiceItems", ...issue.path] })
          );
        }
      }
    }),
});

export const updateInvoiceStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(InvoiceStatus),
    comments: z.string().optional(),
  }),
});
