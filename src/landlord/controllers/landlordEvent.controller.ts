import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import landlordEventService, { CreateLandlordEventDTO, UpdateLandlordEventDTO } from "../../services/landlordEvent.services";
import Joi from "joi";

class LandlordEventController {
  // Create a new event
  createEvent = asyncHandler(async (req: CustomRequest, res: Response) => {
    
    const landlordId = req.user.landlords.id;

    // Validate that endTime is after startTime
    if (new Date(req.body.endTime) <= new Date(req.body.startTime)) {
      return res.status(400).json(
        ApiError.badRequest("End time must be after start time")
      );
    }

    const eventData: CreateLandlordEventDTO = req.body;
    const event = await landlordEventService.createEvent(landlordId, eventData);
    
    return res.status(201).json(
      ApiResponse.success(event, 'Event created successfully')
    );
  });

  // Get landlord events
  getLandlordEvents = asyncHandler(async (req: CustomRequest, res: Response) => {
    
    if (!req.user.landlords || !req.user.landlords.id) {
      return res.status(404).json({
        success: false,
        message: 'Landlord not found',
        error: 'User is not associated with a landlord account'
      });
    }
    
    const landlordId = req.user.landlords.id;
    const { startDate, endDate} = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    }

    const events = await landlordEventService.getEventsByLandlord(landlordId, start, end);
    
    // Always return 200 with an array, even if empty
    return res.status(200).json(
      ApiResponse.success(events || [], 'Events retrieved successfully')
    );
  });

  // Get event by ID
  getEventById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const landlordId = req.user.landlords.id;
    const { eventId } = req.params;

    const event = await landlordEventService.getEventById(eventId, landlordId);
    
    if (!event) {
      return res.status(404).json(
        ApiError.notFound('Event not found')
      );
    }
    
    return res.status(200).json(
      ApiResponse.success(event, 'Event retrieved successfully')
    );
  });

  // Update event
  updateEvent = asyncHandler(async (req: CustomRequest, res: Response) => {
    const landlordId = req.user.landlords.id;
    const { eventId } = req.params;
    
    // Validate that endTime is after startTime if both are provided
    if (req.body.startTime && req.body.endTime && new Date(req.body.endTime) <= new Date(req.body.startTime)) {
      return res.status(400).json(
        ApiError.badRequest("End time must be after start time")
      );
    }

    const eventData: UpdateLandlordEventDTO = req.body;
    const event = await landlordEventService.updateEvent(eventId, landlordId, eventData);
    
    if (!event) {
      return res.status(404).json(
        ApiError.notFound('Event not found')
      );
    }
    
    return res.status(200).json(
      ApiResponse.success(event, 'Event updated successfully')
    );
  });

  // Delete event
  deleteEvent = asyncHandler(async (req: CustomRequest, res: Response) => {
    const landlordId = req.user.landlords.id;
    const { eventId } = req.params;

    const deleted = await landlordEventService.deleteEvent(eventId, landlordId);
    
    if (!deleted) {
      return res.status(404).json(
        ApiError.notFound('Event not found')
      );
    }
    
    return res.status(200).json(
      ApiResponse.success(null, 'Event deleted successfully')
    );
  });
}

export default new LandlordEventController();
