import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import tenantMessagingSettingsService from "../../services/tenantMessagingSettings.service";

class TenantMessagingSettingsController {
  getSettings = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = String(req.user.id);
    const settings = await tenantMessagingSettingsService.getSettings(userId);
    return res.json(ApiResponse.success(settings));
  });

  updateVisibility = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = String(req.user.id);
    const { visibleToNeighborTenants } = req.body as {
      visibleToNeighborTenants?: boolean;
    };

    if (typeof visibleToNeighborTenants !== "boolean") {
      return res.status(400).json({ message: "visibleToNeighborTenants must be a boolean" });
    }

    const updated = await tenantMessagingSettingsService.updateVisibility(
      userId,
      visibleToNeighborTenants
    );
    return res.json(ApiResponse.success(updated, "Messaging visibility updated"));
  });

  shareContact = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = String(req.user.id);
    const { peerUserId } = req.body as { peerUserId?: string };

    if (!peerUserId?.trim()) {
      return res.status(400).json({ message: "peerUserId is required" });
    }

    try {
      const share = await tenantMessagingSettingsService.shareContact(
        userId,
        peerUserId.trim()
      );
      return res.json(ApiResponse.success(share, "Contact shared"));
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Unable to share contact" });
    }
  });

  removeShare = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = String(req.user.id);
    const { peerUserId } = req.params;

    if (!peerUserId?.trim()) {
      return res.status(400).json({ message: "peerUserId is required" });
    }

    await tenantMessagingSettingsService.removeShare(userId, peerUserId.trim());
    return res.json(ApiResponse.success(null, "Shared contact removed"));
  });
}

export default new TenantMessagingSettingsController();
