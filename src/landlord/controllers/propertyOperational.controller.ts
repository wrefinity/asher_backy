import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import PropertyOperationalService from '../../services/propertyOperational.service';
import { upsertOperationalProfileSchema } from '../../validations/schemas/propertyOperational.schema';
import { ApiResponse } from '../../utils/ApiResponse';
import { isPmsOperationalProfileEnabled } from '../../config/featureFlags';

class PropertyOperationalController {
  getOperationalProfile = async (req: CustomRequest, res: Response) => {
    try {
      if (!isPmsOperationalProfileEnabled()) {
        return res.status(404).json({ message: 'Operational profile is not enabled' });
      }
      const landlordId = req.user?.landlords?.id;
      const { propertyId } = req.params;
      if (!landlordId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const data = await PropertyOperationalService.getOperationalProfile(
        propertyId,
        landlordId
      );
      return res.status(200).json(ApiResponse.success(data, 'Operational profile fetched'));
    } catch (error: any) {
      const status = error?.statusCode || 500;
      return res.status(status).json({ message: error?.message || 'Failed to fetch profile' });
    }
  };

  upsertOperationalProfile = async (req: CustomRequest, res: Response) => {
    try {
      if (!isPmsOperationalProfileEnabled()) {
        return res.status(404).json({ message: 'Operational profile is not enabled' });
      }
      const landlordId = req.user?.landlords?.id;
      const { propertyId } = req.params;
      if (!landlordId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const { error, value } = upsertOperationalProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0]?.message });
      }
      const data = await PropertyOperationalService.upsertOperationalProfile(
        propertyId,
        landlordId,
        value
      );
      return res.status(200).json(ApiResponse.success(data, 'Operational profile saved'));
    } catch (error: any) {
      const status = error?.statusCode || 500;
      return res.status(status).json({ message: error?.message || 'Failed to save profile' });
    }
  };
}

export default new PropertyOperationalController();
