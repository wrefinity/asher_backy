import { Request, Response } from 'express';
import ApplicantService from '../services/applicantService';
import { CustomRequest } from "../../utils/types";


class ApplicantControls {

  async createApplicant(req: CustomRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const applicant = await ApplicantService.createApplicant({...req.body, userId});
      res.status(201).json(applicant);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  }

  async getApplicant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const applicant = await ApplicantService.getApplicant(Number(id));
      if (applicant) {
        res.status(200).json(applicant);
      } else {
        res.status(404).json({ message: "Applicant not found" });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  }

  async updateApplicant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const applicant = await ApplicantService.updateApplicant(Number(id), req.body);
      res.status(200).json(applicant);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  }

  async deleteApplicant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const applicant = await ApplicantService.deleteApplicant(Number(id));
      res.status(200).json(applicant);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  }
}

export default new ApplicantControls();
