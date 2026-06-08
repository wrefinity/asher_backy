import { Request, Response } from 'express';
import StateService from '../services/state.services';
import ErrorService from "../services/error.service";
import { CustomRequest } from '../utils/types';

class StateController {

  public getAllStates = async (req: Request, res: Response) => {
    try {
      const states = await StateService.getAllState();
      return res.status(200).json(states);
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  public getStateById = async (req: CustomRequest, res: Response) => {
    try {
      const id = req.params.id;
      const status = await StateService.getStateById(id);
      if (status) {
        res.status(200).json(status);
      } else {
        res.status(404).json({ message: 'State not found' });
      }
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  public createState = async (req: CustomRequest, res: Response) => {
    try {
      const { name, country } = req.body;
      if (!name) {
        return res.status(400).json({ message: "status name required" });
      }
      // Attach the creating landlord's ID so the location persists in their
      // dashboard even before any properties are added to it.
      const landlordId = req.user?.landlords?.id ?? null;
      const existing = await StateService.findConflictingStateForLandlord(
        name,
        landlordId,
        country ?? null
      );
      if (existing) {
        const requestedCountry = (country ?? '').trim();
        const existingCountry = (existing.country ?? '').trim();
        const sameCountry =
          requestedCountry.toLowerCase() === existingCountry.toLowerCase() ||
          (!requestedCountry && !existingCountry);

        return res.status(409).json({
          message: sameCountry
            ? 'You already have a location with this name and country. Open it from the list instead of creating it again.'
            : `You already have "${name}" under ${existingCountry || 'another country'}. Open that location instead of creating the same region under ${requestedCountry || 'a different country'}.`,
          code: 'DUPLICATE_LOCATION',
        });
      }
      const states = await StateService.createState(name, country, landlordId);
      res.status(201).json(states);
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };


  public updateState = async (req: CustomRequest, res: Response) => {
    try {
      const id = req.params.id;
      const { name } = req.body
      if (!name) {
        return res.status(400).json({ message: "states name required" });
      }
      const status = await StateService.updateState(id, name);
      return res.status(200).json(status);
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  public deleteState = async (req: CustomRequest, res: Response) => {
    try {
      const id = req.params.id;
      const landlordId = req.user?.landlords?.id;
      if (!landlordId) {
        return res.status(403).json({ message: "Landlord access required" });
      }
      const result = await StateService.deleteLocationForLandlord(id, landlordId);
      res.status(200).json({
        ...result,
        message: "Location and associated properties removed successfully",
      });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
}

export default new StateController();
