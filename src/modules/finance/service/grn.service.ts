import { IGRN, GRN } from "../models/grn.model";
import { AppError, ErrorType } from "../../../utils/exceptions";
import mongoose from "mongoose";
import { inventoryService } from "./inventory.service";
import { getNextSequenceValue } from "@/utils/counter.util";

export class GRNService {
  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid ID format", 400, ErrorType.VALIDATION);
    }
  }

  private async generateGRNNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const sequence = await getNextSequenceValue("grnNumber");
    return `GRN-${year}${month}-${sequence.toString().padStart(4, "0")}`;
  }

  async createGRN(
    grnData: Partial<IGRN>,
    userId: string,
    files?: Express.Multer.File[]
  ): Promise<IGRN> {
    // Generate GRN number
    const grnNumber = await this.generateGRNNumber();

    // Calculate status based on received quantities
    const status = grnData.items?.every(
      (item) => item.quantity === item.receivedQuantity
    )
      ? "complete"
      : "partial";

    const grn = new GRN({
      ...grnData,
      grnNumber,
      status,
      createdBy: userId,
      updatedBy: userId,
    });

    // Handle file uploads
    if (files?.length) {
      files.forEach((file) => {
        grn.documents.push({
          filePath: file.path,
          description: "GRN supporting document",
        });
      });
    }

    await grn.save();

    // Get the purchase order to access material details
    const purchaseOrder = await mongoose
      .model("PurchaseOrder")
      .findById(grnData.purchaseOrderId);
    if (!purchaseOrder) {
      throw new AppError("Purchase order not found", 404, ErrorType.NOT_FOUND);
    }

    // Update inventory stock levels with reference to this GRN
    for (const item of grnData.items || []) {
      try {
        // Try to update the existing inventory item
        await inventoryService.updateStock(
          item.materialId.toString(),
          item.receivedQuantity,
          true, // isAddition = true for receiving stock
          grnData.projectId ? grnData.projectId.toString() : undefined,
          { type: "GRN", id: grn._id.toString() } // Add source document reference
        );
      } catch (error: any) {
        // If inventory item not found, create a new one
        if (error.statusCode === 404 && error.type === ErrorType.NOT_FOUND) {
          // Find material info from purchase order
          const poMaterial = purchaseOrder.materialList.find(
            (m: any) =>
              m._id.toString() === item.materialId.toString() ||
              (m.materialName &&
                m.materialName
                  .toLowerCase()
                  .includes(item.materialId.toString().toLowerCase()))
          );

          if (poMaterial) {
            // Create new inventory item
            const newItem = await inventoryService.createInventoryItem(
              {
                name: poMaterial.materialName,
                description: `Auto-created from GRN ${grnNumber}`,
                unit: poMaterial.unit,
                category: poMaterial.category,
                unitPrice: poMaterial.unitPrice,
                currentStock: 0, // Will be updated by updateStock
                minimumStock: 5, // Default minimum stock
              },
              userId,
              grnData.projectId ? grnData.projectId.toString() : ""
            );

            // Now update stock with the new item ID
            await inventoryService.updateStock(
              newItem._id.toString(),
              item.receivedQuantity,
              true,
              grnData.projectId ? grnData.projectId.toString() : undefined,
              { type: "GRN", id: grn._id.toString() }
            );

            // Update the GRN item with the correct material ID
            await GRN.updateOne(
              { _id: grn._id, "items.materialId": item.materialId },
              { $set: { "items.$.materialId": newItem._id } }
            );
          } else {
            throw new AppError(
              `Cannot find material details in purchase order for item ${item.materialId}`,
              400,
              ErrorType.VALIDATION
            );
          }
        } else {
          // If it's a different error, rethrow
          throw error;
        }
      }
    }

    return grn;
  }
async getGRN(id: string): Promise<IGRN> {
  this.validateObjectId(id);
  const grn = await GRN.findById(id)
    .populate("createdBy", "fullName")
    .populate("updatedBy", "fullName")
  
  if (!grn) {
    throw new AppError("GRN not found", 404, ErrorType.NOT_FOUND);
  }

  // Transform the response to show only names
  const transformedGrn = grn.toObject();
  transformedGrn.createdBy = (grn.createdBy as any)?.fullName || grn.createdBy;
  transformedGrn.updatedBy = (grn.updatedBy as any)?.fullName || grn.updatedBy;

  return transformedGrn as IGRN;
}

  async getGRNsByProject(projectId: string): Promise<IGRN[]> {
  this.validateObjectId(projectId);
  const grns = await GRN.find({ projectId })
    .populate("items.materialId", "name unit")
    .populate("createdBy", "fullName")
    .populate("updatedBy", "fullName");
  
  // Transform each GRN to show only names
  return grns.map(grn => {
    const transformedGrn = grn.toObject();
    transformedGrn.createdBy = (grn.createdBy as any)?.fullName || grn.createdBy;
    transformedGrn.updatedBy = (grn.updatedBy as any)?.fullName || grn.updatedBy;
    return transformedGrn as IGRN;
  });
}
}

export const grnService = new GRNService();
