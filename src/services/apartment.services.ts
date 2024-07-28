import { prismaClient } from "..";
import { ApartmentIF } from "../validations/interfaces/apartments.interface";
import PropertyServices from "./propertyServices";
class ApartmentService {
  protected inclusion;
  constructor() {
    this.inclusion = {
      property: true
    }
  }

  getApartments = async (propertyId:string) => {
    return await prismaClient.apartments.findMany({
      where: { isDeleted: false, propertyId },
      include: this.inclusion
    })
  }

  getApartmentById = async (id: string) => {
    return await prismaClient.apartments.findFirst(
      {
        where: {
          id,
          isDeleted: false
        },
        include: this.inclusion
      }
    )
  }

  createApartment = async (data: ApartmentIF) => {
    const propertyExists = await PropertyServices.getPropertiesById(data.propertyId);
    if (!propertyExists) {
      throw new Error('Property not found');
    }

    return await prismaClient.apartments.create({
      data: {
        code: data.code,
        description: data.description,
        waitingRoom: data.waitingRoom ?? null,
        bedrooms: data.bedrooms ?? null,
        sittingRoom: data.sittingRoom ?? null,
        kitchen: data.kitchen ?? null,
        bathrooms: data.bathrooms ?? null,
        garages: data.garages ?? null,
        floorplans: data.floorplans ?? [],
        facilities: data.facilities ?? [],
        offices: data.offices ?? null,
        isVacant: data.isVacant ?? true,
        rentalAmount: data.rentalAmount,
        images: data.images ?? [],
        videourl: data.videourl ?? [],
        propertyId: data.propertyId,
      },
      include: {
        property: true,
      }
    });
  };
}

export default new ApartmentService();