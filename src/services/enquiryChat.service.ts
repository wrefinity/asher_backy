import { LogType, logTypeStatus, chatType } from "@prisma/client";
import { prismaClient } from "..";
import PropertyServices from "./propertyServices";
import LogsServices from "./logs.services";
import ChatServices from "./chatServices";
import {
  buildEnquiryChatCardContent,
  parseEnquiryChatCard,
} from "../utils/enquiryChatCard";

class EnquiryChatService {
  private resolveDisplayFromListing(propertyListing: any) {
    const property = propertyListing?.property;
    const room = propertyListing?.room;
    const unit = propertyListing?.unit;

    const entityName =
      room?.roomName ||
      unit?.unitName ||
      unit?.unitNumber ||
      property?.name ||
      "Property";

    const images =
      room?.images?.length
        ? room.images
        : unit?.images?.length
          ? unit.images
          : property?.images || [];

    const firstImage = images[0];
    const imageUrl =
      typeof firstImage === "string"
        ? firstImage
        : firstImage?.url || firstImage?.secure_url || null;

    return {
      propertyName: entityName,
      imageUrl,
      city: property?.city || null,
      country: property?.country || null,
      propertyId: propertyListing.propertyId,
    };
  }

  async ensureEnquiryForMessaging(params: {
    senderId: string;
    propertyListingId: string;
    messageContent?: string;
  }) {
    return this.findOrCreateEnquiry(params);
  }

  private async findOrCreateEnquiry(params: {
    senderId: string;
    propertyListingId: string;
    messageContent?: string;
  }) {
    const existing = await prismaClient.log.findFirst({
      where: {
        createdById: params.senderId,
        propertyListingId: params.propertyListingId,
        type: LogType.ENQUIRED,
        status: logTypeStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) return existing;

    const propertyListing =
      await PropertyServices.getPropertyListingByListingId(
        params.propertyListingId
      );
    if (!propertyListing) return null;

    return LogsServices.createLog({
      propertyId: propertyListing.propertyId || undefined,
      unitId: propertyListing.unitId || undefined,
      roomId: propertyListing.roomId || undefined,
      propertyListingId: params.propertyListingId,
      events: params.messageContent?.trim() || "Interested in this property.",
      createdById: params.senderId,
      type: LogType.ENQUIRED,
      status: logTypeStatus.PENDING,
    });
  }

  private async roomHasEnquiryCard(chatRoomId: string, enquiryId: string) {
    const messages = await prismaClient.message.findMany({
      where: {
        chatRoomId,
        chatType: chatType.APPLICATION,
      },
      select: { content: true },
    });

    return messages.some((msg) => {
      const card = parseEnquiryChatCard(msg.content);
      return card?.enquiryId === enquiryId;
    });
  }

  async ensureEnquirySnapshotMessage(params: {
    senderId: string;
    receiverId: string;
    chatRoomId: string;
    propertyListingId: string;
    messageContent?: string;
  }) {
    const enquiry = await this.findOrCreateEnquiry({
      senderId: params.senderId,
      propertyListingId: params.propertyListingId,
      messageContent: params.messageContent,
    });
    if (!enquiry) return null;

    const alreadyPosted = await this.roomHasEnquiryCard(
      params.chatRoomId,
      enquiry.id
    );
    if (alreadyPosted) return null;

    const propertyListing =
      await PropertyServices.getPropertyListingByListingId(
        params.propertyListingId
      );
    if (!propertyListing) return null;

    const display = this.resolveDisplayFromListing(propertyListing);
    const cardContent = buildEnquiryChatCardContent({
      enquiryId: enquiry.id,
      propertyListingId: params.propertyListingId,
      propertyId: display.propertyId,
      propertyName: display.propertyName,
      imageUrl: display.imageUrl,
      city: display.city,
      country: display.country,
      events: enquiry.events,
      createdAt: enquiry.createdAt?.toISOString?.() ?? null,
    });

    return ChatServices.createRoomMessages(
      cardContent,
      params.senderId,
      params.receiverId,
      params.chatRoomId,
      [],
      [],
      [],
      [],
      chatType.APPLICATION
    );
  }
}

export default new EnquiryChatService();
