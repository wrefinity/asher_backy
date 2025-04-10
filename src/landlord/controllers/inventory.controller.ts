import errorService from "../../services/error.service";
import { Request, Response } from 'express';
import inventoryServices from "../services/inventory.services";
import { inventorySchema, inventoryUpdateSchema } from "../validations/schema/inventorySchema";
import propertyServices from "../../services/propertyServices";

class InventoryController {
    createInventory = async (req: Request, res: Response) => {
        const { value, error } = await inventorySchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const propertyId = value?.propertyId;
        const checkPropsExits = await propertyServices.getPropertyById(propertyId);
        if (!checkPropsExits) return res.status(404).json({ message: "Property not found" });
        try {
            const inventory = await inventoryServices.createInventory(value);
            return res.status(201).json({inventory});

        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getAllInventorys = async (req: Request, res: Response) =>{
        try {
            const inventorys = await inventoryServices.getAllInventory();
            return res.status(200).json({inventorys});
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getInventoryById = async (req: Request, res: Response) =>{
        try {
            const {inventoryId} = req.params;
            const inventory = await inventoryServices.getInventoryById(inventoryId);
            if (!inventory) return res.status(404).json({ message: "Inventory not found" });
            return res.status(200).json(inventory);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    updateInventory = async (req: Request, res: Response) =>{
        // const { value, error } = await inventorySchema.validate(req.body);
        // if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const { value, error } = await inventoryUpdateSchema.validate(req.body);
            if (error) return res.status(400).json({ message: error.details[0].message });
            
            const updatedInventory = await inventoryServices.updateInventory(req.params.inventoryId, value);
            if (!updatedInventory) return res.status(404).json({ message: "Inventory not found" });
            return res.status(200).json({updatedInventory});
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    deleteInventory = async (req: Request, res: Response) =>{
        try {
            const deletedInventory = await inventoryServices.deleteInventory(req.params.inventoryId);
            if (!deletedInventory) return res.status(404).json({ message: "Inventory not found" });
            return res.status(200).json({deletedInventory});
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getAllInventorysByProperty = async (req: Request, res: Response) =>{
        try {
            const { propertyId } = req.params;
            const checkPropsExits = await propertyServices.getPropertyById(propertyId);
            if(!checkPropsExits) return res.status(404).json({ message: "Property not found" });
            const inventorys = await inventoryServices.getAllInventoriesByProperty(propertyId);
            // if (inventorys.length === 0) return res.status(404).json({ message: "No inventorys found" });
            return res.status(200).json({inventorys});
        } catch (error) {
            errorService.handleError(error, res);
        }
    }


}

export default new InventoryController();