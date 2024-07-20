import { categorySchema } from "../validations/schemas/category";
import categoryService from "../services/category.service";
class CategoryControls {

    createCategory = async (req, res) => {
        const { error } = categorySchema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);
        const data = req.body;
        const image = data.cloudinaryUrls;
        delete data.cloudinaryUrls;

        try {
            const category = await categoryService.createCategory({...data, image});
            res.status(201).json(category);
        } catch (err) {
            console.log(err.message)
            res.status(500).json({ error: err.message });
        }
    };

    getAllCategories = async (req, res) => {
        try {
            const categories = await categoryService.getAllCategories();
            res.status(200).json(categories);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    getCategoryById = async (req, res) => {
        try {
            const category = await categoryService.getCategoryById(req.params.id);
            if (!category) return res.status(404).json({ error: 'Category not found' });
            res.status(200).json(category);
        } catch (err) {
            res.status(500).json({ error: err.message });
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
            res.status(500).json({ error: err.message });
        }
    };

    deleteCategory = async (req, res) => {
        try {
            const category = await categoryService.deleteCategory(req.params.id);
            if (!category) return res.status(404).json({ error: 'Category not found' });
            res.status(200).json({ message: 'Category deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
}

export default new CategoryControls()