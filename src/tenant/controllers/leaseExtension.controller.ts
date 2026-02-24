import { Response } from "express";
import { prismaClient } from "../../index";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";

/**
 * Tenant requests a simple lease extension (no rent negotiation).
 * POST /api/tenants/lease-extension/request
 */
export const requestLeaseExtension = async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const tenant = await prismaClient.tenants.findFirst({
      where: { userId, isCurrentLease: true },
      select: { id: true, propertyId: true },
    });
    if (!tenant) return res.status(404).json({ error: "No current tenancy found" });

    const { period, unit, message } = req.body as {
      period: number;
      unit: "WEEKS" | "MONTHS" | "YEARS";
      message?: string;
    };
    if (!period || period <= 0 || !unit)
      return res.status(400).json({ error: "Provide period (positive number) and unit (WEEKS|MONTHS|YEARS)" });
    const validUnits = ["WEEKS", "MONTHS", "YEARS"];
    if (!validUnits.includes(unit))
      return res.status(400).json({ error: "unit must be WEEKS, MONTHS, or YEARS" });

    const request = await prismaClient.leaseExtensionRequest.create({
      data: { tenantId: tenant.id, period, unit, message: message || null },
    });

    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    errorService.handleError(error, res);
  }
};

/**
 * Get current tenant's extension requests.
 * GET /api/tenants/lease-extension/requests
 */
export const getLeaseExtensionRequests = async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const tenant = await prismaClient.tenants.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!tenant) return res.status(200).json({ data: [] });

    const requests = await prismaClient.leaseExtensionRequest.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ data: requests });
  } catch (error) {
    errorService.handleError(error, res);
  }
};
