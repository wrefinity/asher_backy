import errorService from "../../services/error.service";
import { Request, Response } from 'express';
import inventoryServices from "../services/inventory.services";
import { inventorySchema } from "../schema/inventorySchema";

class InventoryController {
    async createInventory(req: Request, res: Response) {
        const { value, error } = await inventorySchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const inventory = await inventoryServices.createInventory(value);
            return res.status(201).json(inventory);

        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getAllInventorys(req: Request, res: Response) {
        try {
            const inventorys = await inventoryServices.getAllInventory();
            return res.status(200).json(inventorys);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getInventoryById(req: Request, res: Response) {
        try {
            const {inventoryId} = req.params;
            const inventory = await inventoryServices.getInventoryById(inventoryId);
            if (!inventory) return res.status(404).json({ message: "Inventory not found" });
            return res.status(200).json(inventory);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async updateInventory(req: Request, res: Response) {
        // const { value, error } = await inventorySchema.validate(req.body);
        // if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const updatedInventory = await inventoryServices.updateInventory(req.params.id, req.body);
            if (!updatedInventory) return res.status(404).json({ message: "Inventory not found" });
            return res.status(200).json(updatedInventory);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async deleteInventory(req: Request, res: Response) {
        try {
            const deletedInventory = await inventoryServices.deleteInventory(req.params.id);
            if (!deletedInventory) return res.status(404).json({ message: "Inventory not found" });
            return res.status(200).json(deletedInventory);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getAllInventorysByProperty(req: Request, res: Response) {
        try {
            const { propertyId } = req.params;
            const inventorys = await inventoryServices.getAllInventoriesByProperty(propertyId);
            if (inventorys.length === 0) return res.status(404).json({ message: "No inventorys found" });
            return res.status(200).json(inventorys);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }


}

export default new InventoryController();