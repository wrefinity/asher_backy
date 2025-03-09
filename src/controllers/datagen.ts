// import { Router, Response } from "express";
// import { userRoles } from "@prisma/client";
// import { Authorize } from "../middlewares/authorize";
// import { CustomRequest } from "../utils/types";
// import { prismaClient } from "..";
// import axios from "axios";
// import stateServices from "../services/state.services";
// import dotenv from "dotenv";
// import PropertyServices from "../services/propertyServices";

// dotenv.config();

// const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
// const UNSPLASH_API_KEY = process.env.UNSPLASH_API_KEY;

// // Nigerian property types
// const propertyTypes = ["LISTING_WEBSITE", "ILS_SYNDICATION"];

// // Nigerian cities and states
// const nigerianLocations = [
//   { city: "Kaduna", state: "Kaduna" },
//   { city: "Asaba", state: "Delta" },
//   { city: "Kebbi", state: "Kebbi" },
//   { city: "Otukpo", state: "Benue" },
//   { city: "Bornu", state: "Bornu" },
// ];

// // Fallback images (used if API fails)
// const fallbackImages = [
//   "https://cdn.pixabay.com/photo/2014/07/10/17/18/large-home-389271_1280.jpg",
//   "https://cdn.pixabay.com/photo/2024/03/23/16/49/door-8651642_1280.jpg",
//   "https://cdn.pixabay.com/photo/2017/07/09/03/19/home-2486092_1280.jpg",
//   "https://cdn.pixabay.com/photo/2017/06/05/20/10/house-2375119_1280.jpg"
// ];

// /**
//  * Fetch images from Pexels API
//  * @param propertyType
//  * @returns {Promise<string[]>} - Array of image URLs
//  */
// async function fetchImagesFromPexels(propertyType: string): Promise<string[]> {
//   try {
//     const response = await axios.get("https://api.pexels.com/v1/search", {
//       params: { query: `${propertyType} house Nigeria`, per_page: 5 },
//       headers: { Authorization: PEXELS_API_KEY },
//     });

//     return response.data.photos.map((photo: any) => photo.src.large).slice(0, 3);
//   } catch (error) {
//     console.error("Pexels API failed, trying Unsplash...");
//     return fallbackImages
//   }
// }

// /**
//  * Fetch images from Unsplash API (fallback)
//  * @param propertyType
//  * @returns {Promise<string[]>} - Array of image URLs
//  */
// async function fetchImagesFromUnsplash(propertyType: string): Promise<string[]> {
//   try {
//     const response = await axios.get("https://api.unsplash.com/search/photos", {
//       params: { query: `${propertyType} house Nigeria`, per_page: 5 },
//       headers: { Authorization: `Client-ID ${UNSPLASH_API_KEY}` },
//     });

//     return response.data.results.map((photo: any) => photo.urls.regular).slice(0, 3);
//   } catch (error) {
//     console.error("Both Pexels & Unsplash failed, using fallback images.");
//     return fallbackImages;
//   }
// }

// /**
//  * Generate a sample property
//  * @param landlordId
//  * @returns {Promise<Object>} - Property object
//  */
// async function generateSampleProperty(landlordId: string) {
//   const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
//   const location = nigerianLocations[Math.floor(Math.random() * nigerianLocations.length)];
//   const images = await fetchImagesFromPexels(propertyType);
//   const state = await stateServices.getStateByName(location.state);

//   return {
//     name: `Sample ${propertyType} in ${location.city}`,
//     description: `A well-built ${propertyType} located in ${location.city}, ${location.state}.`,
//     propertysize: Math.floor(Math.random() * 500) + 50, // Between 50-550 sqm
//     isDeleted: false,
//     showCase: Math.random() < 0.5,
//     landlordId,
//     agencyId: null,
//     currency: "NGN",
//     marketValue: 5000000 + Math.random() * 25000000, // 5M - 30M NGN
//     rentalFee: 500000 + Math.random() * 2000000, // 500K - 2.5M NGN
//     initialDeposit: 100000 + Math.random() * 500000, // 100K - 600K NGN
//     dueDate: new Date(),
//     yearBuilt: new Date(new Date().setFullYear(new Date().getFullYear() - Math.floor(Math.random() * 50))),
//     city: location.city,
//     stateId: state?.id || null,
//     country: "Nigeria",
//     zipcode: "23401",
//     location: `${Math.random() * 5 + 6}° N, ${Math.random() * 9 + 3}° E`, // Approximate Nigerian coordinates
//     images,
//     videourl: [],
//     amenities: ["Borehole Water", "Security", "Parking Space"],
//     totalApartments: Math.floor(Math.random() * 10) + 1,
//     longitude: Math.random() * 5 + 6,
//     latitude: Math.random() * 9 + 3,
//     availability: "VACANT",
//     type: "SINGLE_UNIT",
//     specificationType: "RESIDENTIAL",
//     useTypeCategory: "Living",
//   };
// }

// /**
//  * Class to handle generating property transactions for landlords
//  */
// class GenerateTransactionRouter {
//   public router: Router;
//   private authenticateService: Authorize;

//   constructor() {
//     this.router = Router();
//     this.authenticateService = new Authorize();
//     this.initializeRoutes();
//   }

//   private initializeRoutes() {
//     this.router.use(this.authenticateService.authorize);
//     this.router.use(this.authenticateService.authorizeRole(userRoles.LANDLORD));

//     // Route to generate and seed properties for a landlord
//     this.router.get("/", async (req: CustomRequest, res: Response) => {
//       try {
//         const landlordId = req?.user?.landlords?.id;
//         if (!landlordId) {
//           return res.status(400).json({ error: "Landlord ID is required" });
//         }

//         const properties = [];

//         for (let i = 0; i < 5; i++) {
//           const propertyData = await generateSampleProperty(landlordId);
//           const createdProperty = await prismaClient.properties.create({ data: propertyData });

//           const data = {
//             payApplicationFee: true,
//             isShortlet: false,
//             shortletDuration: "YEARLY",
//             type: "LISTING_WEBSITE",
//             propertyId: createdProperty?.id
//           }

//           await PropertyServices.createPropertyListing(data);


//           properties.push(createdProperty);
//           console.log(`✅ Property ${i + 1} added: ${propertyData.name}`);
//         }

//         console.log("🎉 Seeding complete!");
//         return res.status(201).json({ message: "Properties seeded successfully", properties });
//       } catch (error) {
//         console.error("❌ Error seeding properties:", error);
//         return res.status(500).json({ error: "Internal Server Error" });
//       } finally {
//         await prismaClient.$disconnect();
//       }
//     });
//   }
// }

// export default new GenerateTransactionRouter().router;


