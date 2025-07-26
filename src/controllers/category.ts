import { CategoryQuerySchema, categorySchema } from "../validations/schemas/category";
import categoryService from "../services/category.service";
import ErrorService from "../services/error.service";
import { Request, Response } from "express";
import { CategoryType } from "@prisma/client";

class CategoryControls {

    createCategory = async (req, res) => {
        const { error } = categorySchema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);
        const data = req.body;
        const image = data.cloudinaryUrls;
        delete data.cloudinaryUrls;
        delete data.cloudinaryVideoUrls;
        delete data.cloudinaryDocumentUrls;
        delete data.cloudinaryAudioUrls;

        try {
            const category = await categoryService.createCategory({ ...data, image });
            res.status(201).json(category);
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    };

    getCategories = async (req: Request, res: Response) =>{
        try {
            const { error, value } = CategoryQuerySchema.validate(req.query);
            if (error) {
                return res.status(400).json({ error: error.details });
            }
            const result = await categoryService.getCategories(value);

            return res.status(200).json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
    getAllCategoriesType = async (req, res) => {
        try {
            const type = req.query.type;
            // Check if the type is valid (i.e., matches the CategoryType enum)
            if (!type || !Object.values(CategoryType).includes(type)) {
                return res.status(400).json({ message: "Invalid type. Please provide a valid type from the CategoryType enum (SERVICES, MAINTENANCE, BILL, etc..)." });
            }
            // Fetch the subcategories based on the type and categoryId
            const subCategories = await categoryService.getAllCategoriesTypes(type);
            res.status(200).json({ subCategories });
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    getCategoryById = async (req, res) => {
        try {
            const category = await categoryService.getCategoryById(req.params.id);
            if (!category) return res.status(404).json({ error: 'Category not found' });
            res.status(200).json(category);
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    };

    updateCategory = async (req, res) => {
        const { error } = categorySchema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        try {
            const category = await categoryService.updateCategory(req.params.id, req.body);
            if (!category) return res.status(404).json({ error: 'Category not found' });
            res.status(200).json(category);
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    };

    deleteCategory = async (req, res) => {
        try {
            const category = await categoryService.deleteCategory(req.params.id);
            if (!category) return res.status(404).json({ error: 'Category not found' });
            res.status(200).json({ message: 'Category deleted successfully' });
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    };
}

export default new CategoryControls()