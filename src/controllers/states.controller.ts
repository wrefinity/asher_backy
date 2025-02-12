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
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "status name required" });
      }
      const states = await StateService.createState(name);
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
      const deleted = await StateService.deleteState(id);
      res.status(200).json({ deleted, message: "state deleted" });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
}

export default new StateController();
