import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { CreateEventDTO, UpdateEventDTO, VendorAvailabilityDTO } from '../../validations/interfaces/events.interface';
import eventService from "../../services/event.services";

class EventsController {
  // Get all maintenances
  createEvent = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vendorId = req.user.vendors.id;
    const eventData: CreateEventDTO = req.body;

    const event = await eventService.createEvent(vendorId, eventData);
    
    return res.status(201).json(
      ApiResponse.success(event, 'Event created successfully')
    );
  });

  getVendorEvents = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vendorId = req.user.vendors.id;
    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    }

    const events = await eventService.getEventsByVendor(vendorId, start, end);
    
    return res.status(200).json(
      ApiResponse.success(events, 'Events retrieved successfully')
    );
  });

  // getEventsByDateRange = asyncHandler(async (req: CustomRequest, res: Response) => {
  //   const vendorId = req.user.vendors.id;
  //   const { startDate, endDate } = req.query;

  //   if (!startDate || !endDate) {
  //     return res.status(400).json(
  //       ApiError.badRequest('startDate and endDate are required')
  //     );
  //   }

  //   const start = new Date(startDate as string);
  //   const end = new Date(endDate as string);

  //   const events = await eventService.getEventsByDateRange(vendorId, start, end);
    
  //   return res.status(200).json(
  //     ApiResponse.success(events, 'Events retrieved successfully')
  //   );
  // });

  getEventById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vendorId = req.user.vendors.id;
    const { eventId } = req.params;

    const event = await eventService.getEventById(eventId, vendorId);
    
    return res.status(200).json(
      ApiResponse.success(event, 'Event retrieved successfully')
    );
  });

  updateEvent = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vendorId = req.user.vendors.id;
    const { eventId } = req.params;
    const updates: UpdateEventDTO = req.body;

    const event = await eventService.updateEvent(eventId, vendorId, updates);
    
    return res.status(200).json(
      ApiResponse.success(event, 'Event updated successfully')
    );
  });

  deleteEvent = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vendorId = req.user.vendors.id;
    const { eventId } = req.params;

    await eventService.deleteEvent(eventId, vendorId);
    
    return res.status(200).json(
      ApiResponse.success(null, 'Event deleted successfully')
    );
  });

  setAvailability = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vendorId = req.user.vendors.id;
    const availability: VendorAvailabilityDTO[] = req.body.availability;

    await eventService.setVendorAvailability(vendorId, availability);
    
    return res.status(200).json(
      ApiResponse.success(null, 'Availability updated successfully')
    );
  });

  getAvailability = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vendorId = req.user.vendors.id;

    const availability = await eventService.getVendorAvailability(vendorId);
    
    return res.status(200).json(
      ApiResponse.success(availability, 'Availability retrieved successfully')
    );
  });
}

export default new EventsController();
