import { Request, Response } from "express";
import RoleManagementService from "../services/roles.services";
import { assignRoleSchema } from "../validations/schemas/auth";
import { CustomRequest } from "../utils/types";


class RoleManagementController {
  // Assign roles to a user
  assignRoles = async (req: CustomRequest, res: Response) => {
    try {
      const { error } = assignRoleSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const updatedUser = await RoleManagementService.assignRoles(req.body);
      return res.status(200).json({ message: "Roles assigned successfully", updatedUser });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Get a user's roles
  getUserRoles = async (req: CustomRequest, res: Response) =>{
    try {
      const userId = req.params.userId;
      const roles = await RoleManagementService.getUserRoles(userId);
      return res.status(200).json({ roles });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Remove roles from a user
  removeRoles = async (req: CustomRequest, res: Response) =>{
    try {
      const { userId, rolesToRemove } = req.body;
      const updatedUser = await RoleManagementService.removeRoles(userId, rolesToRemove);
      return res.status(200).json({ message: "Roles removed successfully", updatedUser });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export default new RoleManagementController() 