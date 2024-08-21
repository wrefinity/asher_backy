import { IPropertyDocument } from '../validations/interfaces/properties.interface';
import { prismaClient } from "..";


export class PropertyDocumentService {
    create = async (data: IPropertyDocument) =>{
    return prismaClient.propertyDocument.create({ data });
  }

  findAll = async () =>{
    return prismaClient.propertyDocument.findMany();
  }

  findById = async (id: string)=>{
    return prismaClient.propertyDocument.findUnique({ where: { id } });
  }

  update = async (id: string, data: IPropertyDocument) =>{
    return prismaClient.propertyDocument.update({
      where: { id },
      data,
    });
  }

  delete = async (id: string)=>{
    return prismaClient.propertyDocument.delete({ where: { id } });
  }
}
