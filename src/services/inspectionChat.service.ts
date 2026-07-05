import { chatType } from '@prisma/client';
import { prismaClient, serverInstance } from '..';
import NotificationService from './notification.service';

class InspectionChatService {
  private async getInspectionParticipants(inspectionId: string) {
    const inspection = await prismaClient.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        acknowledgment: true,
        tenant: { select: { id: true, userId: true } },
        property: { select: { id: true, landlordId: true, name: true } },
      },
    });

    if (!inspection) {
      throw Object.assign(new Error('INSPECTION_NOT_FOUND'), { statusCode: 404 });
    }

    if (!inspection.acknowledgment?.disputed) {
      throw Object.assign(new Error('DISPUTE_CHAT_NOT_AVAILABLE'), { statusCode: 403 });
    }

    const landlord = inspection.property?.landlordId
      ? await prismaClient.landlords.findUnique({
          where: { id: inspection.property.landlordId },
          select: { userId: true },
        })
      : null;

    const tenantUserId = inspection.tenant?.userId;
    const landlordUserId = landlord?.userId;

    if (!tenantUserId || !landlordUserId) {
      throw Object.assign(new Error('PARTICIPANTS_NOT_FOUND'), { statusCode: 400 });
    }

    return {
      inspection,
      tenantUserId,
      landlordUserId,
    };
  }

  private assertParticipant(userId: string, tenantUserId: string, landlordUserId: string) {
    if (userId !== tenantUserId && userId !== landlordUserId) {
      throw Object.assign(new Error('FORBIDDEN'), { statusCode: 403 });
    }
  }

  async ensureDisputeChatRoom(inspectionId: string) {
    const { inspection, tenantUserId, landlordUserId } =
      await this.getInspectionParticipants(inspectionId);

    const [userA, userB] = [tenantUserId, landlordUserId].sort();

    let chatRoom = await prismaClient.chatRoom.findUnique({
      where: { inspectionId },
    });

    if (!chatRoom) {
      chatRoom = await prismaClient.chatRoom.create({
        data: {
          user1Id: userA,
          user2Id: userB,
          inspectionId,
        },
      });
    }

    const messageCount = await prismaClient.message.count({
      where: {
        chatRoomId: chatRoom.id,
        chatType: chatType.INSPECTION,
      },
    });

    if (messageCount === 0 && inspection.acknowledgment?.comments) {
      await prismaClient.message.create({
        data: {
          content: `Dispute note: ${inspection.acknowledgment.comments}`,
          senderId: tenantUserId,
          receiverId: landlordUserId,
          chatRoomId: chatRoom.id,
          chatType: chatType.INSPECTION,
        },
      });
    }

    return chatRoom;
  }

  async getDisputeChat(inspectionId: string, userId: string) {
    const { tenantUserId, landlordUserId } =
      await this.getInspectionParticipants(inspectionId);
    this.assertParticipant(userId, tenantUserId, landlordUserId);

    await this.ensureDisputeChatRoom(inspectionId);

    const chatRoom = await prismaClient.chatRoom.findUnique({
      where: { inspectionId },
      include: {
        messages: {
          where: { chatType: chatType.INSPECTION },
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    fullname: true,
                    firstName: true,
                    lastName: true,
                    profileUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      available: true,
      chatRoomId: chatRoom?.id || null,
      messages: chatRoom?.messages || [],
      receiverId: userId === tenantUserId ? landlordUserId : tenantUserId,
    };
  }

  async sendDisputeMessage(inspectionId: string, senderId: string, content: string) {
    if (!content?.trim()) {
      throw Object.assign(new Error('MESSAGE_REQUIRED'), { statusCode: 400 });
    }

    const { tenantUserId, landlordUserId } =
      await this.getInspectionParticipants(inspectionId);
    this.assertParticipant(senderId, tenantUserId, landlordUserId);

    const chatRoom = await this.ensureDisputeChatRoom(inspectionId);
    const receiverId = senderId === tenantUserId ? landlordUserId : tenantUserId;

    const message = await prismaClient.message.create({
      data: {
        content: content.trim(),
        senderId,
        receiverId,
        chatRoomId: chatRoom.id,
        chatType: chatType.INSPECTION,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullname: true,
                firstName: true,
                lastName: true,
                profileUrl: true,
              },
            },
          },
        },
      },
    });

    const payload = {
      id: message.id,
      chatRoomId: message.chatRoomId,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      createdAt: message.createdAt,
      chatType: message.chatType,
    };

    serverInstance.io.to(senderId).emit('privateMessage', payload);
    serverInstance.io.to(receiverId).emit('privateMessage', payload);
    serverInstance.io.to(`user:${senderId}`).emit('privateMessage', payload);
    serverInstance.io.to(`user:${receiverId}`).emit('privateMessage', payload);

    try {
      const propertyName = (await prismaClient.inspection.findUnique({
        where: { id: inspectionId },
        select: { property: { select: { name: true } } },
      }))?.property?.name;

      await NotificationService.createNotification(
        {
          sourceId: senderId,
          destId: receiverId,
          title: 'Inspection Dispute Reply',
          message: propertyName
            ? `New dispute message for the inspection at ${propertyName}.`
            : 'New dispute message on an inspection report.',
          notificationType: 'inspection_dispute_message',
          route: senderId === tenantUserId
            ? `/service/inspections/${inspectionId}`
            : `/inspections/${inspectionId}`,
        },
        'COMMUNICATION'
      );
    } catch (notifErr) {
      console.warn('Failed to send inspection dispute message notification', notifErr);
    }

    return message;
  }
}

export default new InspectionChatService();
