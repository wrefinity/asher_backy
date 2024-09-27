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

  getApartments = async (propertyId: string) => {
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
    if (!propertyExists) throw new Error('Property not found'); 
    return await prismaClient.apartments.create({
      data: {
        code: data.code,
        description: data.description,
        waitingRoom: data.waitingRoom ?? null,
        name: data.name,
        size: data.size,
        monthlyRent: data.monthlyRent,
        minLeaseDuration: data.minLeaseDuration,
        maxLeaseDuration: data.maxLeaseDuration,
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

  updateApartment = async (id: string, data: Partial<ApartmentIF>) => {
    const apartmentExists = await this.getApartmentById(id);
    if (!apartmentExists)
      throw new Error("Apartment not found");

    if (data.propertyId) {
      const propertyExists = await PropertyServices.getPropertiesById(data.propertyId);
      if (!propertyExists) {
        throw new Error("Property not found");
      }
    }

    return await prismaClient.apartments.update({
      where: { id },
      data: {
        code: data.code ?? apartmentExists.code,
        description: data.description ?? apartmentExists.description,
        name: data.name ?? apartmentExists.name,
        size: data.size ?? apartmentExists.size,
        monthlyRent: data.monthlyRent ?? apartmentExists.monthlyRent,
        minLeaseDuration: data.minLeaseDuration ?? apartmentExists.minLeaseDuration,
        maxLeaseDuration: data.maxLeaseDuration ?? apartmentExists.maxLeaseDuration,
        sittingRoom: data.sittingRoom ?? apartmentExists.sittingRoom,
        waitingRoom: data.waitingRoom ?? apartmentExists.waitingRoom,
        bedrooms: data.bedrooms ?? apartmentExists.bedrooms,
        kitchen: data.kitchen ?? apartmentExists.kitchen,
        bathrooms: data.bathrooms ?? apartmentExists.bathrooms,
        garages: data.garages ?? apartmentExists.garages,
        floorplans: data.floorplans ?? apartmentExists.floorplans,
        facilities: data.facilities ?? apartmentExists.facilities,
        offices: data.offices ?? apartmentExists.offices,
        isVacant: data.isVacant ?? apartmentExists.isVacant,
        rentalAmount: data.rentalAmount ?? apartmentExists.rentalAmount,
        images: data.images ?? apartmentExists.images,
        videourl: data.videourl ?? apartmentExists.videourl,
        propertyId: data.propertyId ?? apartmentExists.propertyId,
      },
      include: this.inclusion,
    });
  }

  // Fetch apartments based on the currently logged-in landlord
  getApartmentsByLandlord = async (landlordId: string) => {
    return await prismaClient.apartments.findMany({
      where: {
        isDeleted: false,
        property: {
          landlordId,
          isDeleted: false,
        },
      },
      include: this.inclusion,
    })
  }
  deleteApartment = async (id: string) => {
    return await prismaClient.apartments.update({
      where: { id },
      data: {
        isDeleted: false
      }
    });
  }
}

export default new ApartmentService();