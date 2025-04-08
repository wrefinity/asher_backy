import unittest
from merge_sort import KnapsackSolver
import tempfile
import os


class TestKnapsack(unittest.TestCase):

    def setUp(self):
        self.solver = KnapsackSolver()

    def createTempFile(self, context):
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write(context)
            return f.name
        
    def test_read_items(self):
        # Test for Empty Knapsack
        item_text = "10  100\n"
        temp_file = self.createTempFile(item_text)
        items = self.solver.read_items(temp_file)
        os.unlink(temp_file)

        included = self.solver.find_dynamic(items, 0)
        self.assertEqual(self.solver.best_price, 0)
        self.assertEqual(included, [])

        # test for single item that fit exactly
        included = self.solver.find_dynamic(items, 10)
        self.assertEqual(self.solver.best_price, 100)
        self.assertEqual(included, [0])

    def test_dynamic_solution(self):
        # Test for Dynamic Solution
        item_text = "10  60\n20  100\n30  120\n"
        temp_file = self.createTempFile(item_text)
        items = self.solver.read_items(temp_file)
        os.unlink(temp_file)

        included = self.solver.find_dynamic(items, 50)
        self.assertEqual(self.solver.best_price, 220)
        self.assertEqual(included, [1, 2])


    def test_greedy_solution(self):
        # Test for Greedy Solution
        item_text = "10  60\n20  100\n30  120\n"
        temp_file = self.createTempFile(item_text)
        items = self.solver.read_items(temp_file)
        os.unlink(temp_file)

        included = self.solver.find_greedy(items, 50)
        self.assertEqual(self.solver.best_price, 160)
        self.assertEqual(included, [0, 1])

    def test_greedy_suboptimal(self):
        # Test for Greedy Suboptimal
        item_text = "3  5\n2  3\n"
        temp_file = self.createTempFile(item_text)
        items = self.solver.read_items(temp_file)
        os.unlink(temp_file)

        self.solver.find_greedy(items, 2)
        self.assertEqual(self.solver.best_price, 3)
        self.assertEqual(self.solver.find_greedy(items, 2), [1])


if __name__ == '__main__':
    unittest.main()


           



