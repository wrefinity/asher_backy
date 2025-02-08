import { subCategorySchema } from "../validations/schemas/category";
import SubCategoryService from "../services/subcategory.service";
import { CustomRequest } from "../utils/types";
import errorService from "../services/error.service";
import categoryService from "../services/category.service";
import { CategoryType } from "@prisma/client";
class SubCategoryControls {


    createSubCategory = async (req: CustomRequest, res) => {
        const { error } = subCategorySchema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        try {
            // check for categoryId existance
            const categoryId = req.params.categoryId
            const categoryExist = await categoryService.getCategoryById(categoryId)
            if (!categoryExist) return res.status(400).json({ message: "category doesnt exist" })

            const data = req.body;
            const image = data.cloudinaryUrls;
            delete data.cloudinaryUrls;
            delete data.cloudinaryVideoUrls;
            delete data.cloudinaryDocumentUrls;

            const subCategory = await SubCategoryService.createSubCategory({ ...data, categoryId, image });
            res.status(201).json(subCategory);
        } catch (err) {
            errorService.handleError(err, res);
        }
    }

    // Other CRUD operations
    getAllSubCategories = async (req, res) => {
        try {
            const subCategories = await SubCategoryService.getAllSubCategories();
            res.status(200).json({ subCategories });
        } catch (err) {
            errorService.handleError(err, res);
        }
    }
    getAllSubCategoriesForCategoryIdType = async (req, res) => {
        try {
            // Check if categoryId exists
            const categoryId = req.params.categoryId;
            const type = req.query.type;
    
            // Check if category exists
            const categoryExist = await categoryService.getCategoryById(categoryId);
            if (!categoryExist) {
                return res.status(400).json({ message: "Category doesn't exist" });
            }
    
            // Check if the type is valid (i.e., matches the CategoryType enum)
            if (!type || !Object.values(CategoryType).includes(type)) {
                return res.status(400).json({ message: "Invalid type. Please provide a valid type from the CategoryType enum (SERVICES, MAINTENANCE, BILL, etc..)." });
            }
            // Fetch the subcategories based on the type and categoryId
            const subCategories = await SubCategoryService.getAllSubCategoriesTypes(type, categoryId);
            res.status(200).json({ subCategories });
        } catch (err) {
            errorService.handleError(err, res);
        }
    }

    getSubCategoryById = async (req, res) => {
        try {
            const subCategory = await SubCategoryService.getSubCategoryById(req.params.id);
            if (!subCategory) return res.status(404).json({ error: 'SubCategory not found' });
            res.status(200).json(subCategory);
        } catch (err) {
            errorService.handleError(err, res);
        }
    }

    updateSubCategory = async (req, res) => {
        const { error } = subCategorySchema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        try {
            const subCategory = await SubCategoryService.updateSubCategory(req.params.id, req.body);
            if (!subCategory) return res.status(404).json({ error: 'SubCategory not found' });
            res.status(200).json(subCategory);
        } catch (err) {
            errorService.handleError(err, res);
        }
    }

    deleteSubCategory = async (req, res) => {
        try {
            const subCategory = await SubCategoryService.deleteSubCategory(req.params.id);
            if (!subCategory) return res.status(404).json({ error: 'SubCategory not found' });
            res.status(200).json({ message: 'SubCategory deleted successfully' });
        } catch (err) {
            errorService.handleError(err, res);
        }
    }

}

export default new SubCategoryControls()