


# def fibonacci(n):
#     if n == 0:
#         return 0
#     if n == 1:
#         return 1
    
#     # intialize an array to store the fibonacci values
#     fib = [0] * (n + 1) 
#     fib[0] = 0
#     fib[1] = 1 

#     for i in range(2, n + 1): 
#         fib[i] = fib[i - 1] + fib[i - 2]

#     return fib[n]




# def fibonacci_optimized(n):

#     if n == 0:
#         return 0
#     if n == 1:
#         return 1
#     prev2 = 0
#     prev1 = 1

#     for _ in range(2, n + 1):
#         curr = prev1 + prev2
#         prev2 = prev1
#         prev1 = curr

#     return prev1    

# print(fibonacci(300))












def cut_rod(prices, n):
    if n == 0:
        return 0  # Base case: no revenue for length 0
    max_revenue = float('-inf')
    for i in range(1, n + 1):
        max_revenue = max(max_revenue, prices[i - 1] + cut_rod(prices, n - i))
    return max_revenue

prices = [1, 5, 8, 9, 10, 17, 17, 20, 24, 30]  # 1-based index adjusted
print(cut_rod(prices, 4))  
Output: 10 (2 + 2)




# """red black tree modules"""
# import sys


# class Node():
#     """Node definition for tree"""

#     def __init__(self, data):
#         self.data = data
#         self.parent = None
#         self.left = None
#         self.right = None
#         self.color = 1


# class RedBlackTree():
#     """red black tree """

#     def __init__(self):
#         """on init we create the root node with null values"""
#         self.TreeN = Node(0)
#         self.TreeN.color = 0  # default as black (0)
#         self.TreeN.left = None
#         self.TreeN.right = None
#         # set the root tree
#         self.root = self.TreeN

#     # pre-order
#     def pre_order_func(self, node):
#         """root->left->right"""
#         if node != self.TreeN:
#             sys.stdout.write(node.data + " -> ")
#             self.pre_order_func(node.left)
#             self.pre_order_func(node.right)

#     # in-order
#     def in_order_func(self, node):
#         """left->root->right"""
#         if node != self.TreeN:
#             self.in_order_func(node.left)
#             sys.stdout.write(node.data + " -> ")
#             self.in_order_func(node.right)

#     # in-order
#     def post_order_func(self, node):
#         """left->right->root"""
#         if node != self.TreeN:
#             self.post_order_func(node.left)
#             self.post_order_func(node.right)
#             sys.stdout.write(node.data + " -> ")

#     # search the tree
#     def search_tree_func(self, node, key):
#         if node == self.TreeN or key == node.data:
#             return node
#         if key < node.data:
#             return self.search_tree_func(node.left, key)
#         return self.search_tree_func(node.right, key)

#     # rb transplant
#     def rb_transplant(self, u, v):
#         # u is the node to be replace -> the one to be deleted
#         if u.parent is None:  # u is the root
#             self.root = v
#         elif u == u.parent.left:
#             u.parent.left = v
#         else:
#             u.parent.right = v
#         v.parent = u.parent


#     # insert
#     def insert(self, key):
#         node = Node(key)
#         node.parent = None
#         node.data = key
#         node.left = self.TreeN
#         node.right = self.TreeN
#         node.color = 1
#         y = None
#         x = self.root

#         while x != self.TreeN:
#             y = x

#             if node.data < x.data:
#                 x = x.left
#             else:
#                 x = x.right

#         node.parent = y
#         if y == None:  # when there is no tree
#             self.root = node  # make the new node the root node
#         elif y.data > node.data:
#             y.left = node
#         else:
#             y.right = node

#         if node.parent == None:
#             node.color = 0
#             return
#         if node.parent.parent == None:
#             return

#         self.insert_fix(node)

#     def insert_fix(self, node):
#         """insert fix"""
#         # check if the parent is non
#         if node.parent is None:
#             node.color = 0  # make it black
#             self.root = node
#             return
        
#         while node.parent is not None and node.parent.color == 1:
#             if node.parent == node.parent.parent.left:
#                 u_node = node.parent.parent.right
#                 if u_node and u_node.color == 1:
#                     node.parent.color = 0
#                     u_node.color = 0
#                     node.parent.parent.color = 1
#                     node = node.parent.parent
#                 else:
#                     if node == node.parent.right:
#                         node = node.parent
#                         self.left_rotate(node)
#                     node.parent.color = 0
#                     node.parent.parent.color = 1
#                     self.right_rotate(node.parent.parent)
#             else:

#                 u_node = node.parent.parent.left
#                 if u_node and u_node.color == 1:
#                     node.parent.color = 0
#                     u_node.color = 0
#                     node.parent.parent.color = 1
#                     node = node.parent.parent
#                 else:
#                     if node == node.parent.left:
#                         node = node.parent
#                         self.right_rotate(node)
#                     node.parent.color = 0
#                     node.parent.parent.color = 1
#                     self.left_rotate(node.parent.parent) 

#         # ensure the root is black
#         self.root.color = 0


#     def right_rotate(self, x):
#         y = x.left
#         x.left = y.right

#         if y.right != self.TreeN:
#             y.right.parent = x

#         y.parent = x.parent
#         if x.parent == None:
#             self.root = y
#         elif x == x.parent.right:
#             x.parent.right = y
#         else:
#             x.parent.left = y
#         y.right = x
#         x.parent = y

#     def left_rotate(self, x):
#         y = x.right
#         x.right = y.left

#         if y.left != self.TreeN:
#             y.left.parent = x
#         y.parent = x.parent
#         if x.parent == None:
#             self.root = y
#         elif x == x.parent.left:
#             x.parent.left = y
#         else:
#             x.parent.right = y
#         y.left = x
#         x.parent = y

#     def preoder(self):
#         self.pre_order_func(self.root)

#     def inorder(self):
#         self.in_order_func(self.root)

#     def postorder(self):
#         self.post_order_func(self.root)

#     def search_tree(self, data):
#         self.search_tree_func(self.root, data)

#     def minimum(self, node):
#         while node.left != self.TreeN:
#             node = node.left
#         return node

#     def maximun(self, node):
#         while node.right != self.TreeN:
#             node = node.right
#         return node

#     def successor(self, node):
#         if node.right != self.TreeN:
#             return self.minimum(node.right)
#         temp = node.parent
#         while temp != self.TreeN and node == temp.right:
#             node = temp
#             temp = temp.parent
#         return temp

#     def predecessor(self, node):
#         if node.left != self.TreeN:
#             return self.maximun(node.left)
#         temp = node.parent
#         while temp != self.TreeN and node == temp.left:
#             node = temp
#             temp = temp.parent
#         return temp
    
#     def delete_node(self, data):
#         print("====================")
#         print(self.root.data, data)
#         self.delete_node_func(self.root, data)
    
#     def print_tree(self):
#         self.print_helper(self.root, "", True)

#     def print_helper(self, node, indent, last):
#         if node != self.TreeN:
#             sys.stdout.write(indent)
#             if last:
#                 sys.stdout.write("R-----")
#                 indent += " "
#             else: 
#                 sys.stdout.write("L-----")
#                 indent += "| "
#             s_color = "RED" if node.color == 1 else "Black"
#             print(str(node.data) + "(" + s_color + ")")
#             self.print_helper(node.left, indent, False)
#             self.print_helper(node.right, indent, True)


#     # helper function to delete
#     def delete_node_func(self, node, key):
#         """deletion """
#         z = self.TreeN  # creating an empty RBtree
#         # while node.data == key:
#         while node != self.TreeN:
#             if node.data == key:
#                 z = node

#             if node.data <= key:
#                 node = node.right
#             else:
#                 node = node.left

#         if z == self.TreeN:
#             print("cannot find the key within the tree")
#             return
#         y = z
#         y_original_color = y.color
#         if z.left == self.TreeN:
#             x = z.right
#             self.rb_transplant(z, z.right)
#         elif z.right == self.TreeN:
#             x = z.left
#             self.rb_transplant(z, z.left)
#         else:
#             y = self.minimum(z.right)
#             y_original_color = y.color
#             x = y.right
#             if y.parent == z:
#                 x.parent = y
#             else:
#                 self.rb_transplant(y, y.right)
#                 y.right = z.right
#                 y.right.parent = y
#             self.rb_transplant(z, y)
#             y.left = z.left
#             y.left.parent = y
#             y.color = z.color
#         if y_original_color == 0:
#             self.delete_node_fix(x)

#     # deletion of a node
#     def delete_node_fix(self, x):
#         while x != self.root and x.color == 0:
#             if x == x.parent.left:
#                 b = x.parent.right
#                 if b.color == 1:
#                     b.color = 0
#                     x.parent.color = 1
#                     self.left_rotate(x.parent)
#                     b = x.parent.right
#                 if b.left.color == 0 and b.right.color == 0:
#                     b.color = 1
#                     x = x.parent
#                 else:
#                     if b.right.color == 0:
#                         b.left.color = 0
#                         b.color = 1
#                         self.right_rotate(b)
#                         b = x.parent.right
#                     b.color = x.parent.color
#                     x.parent.color = 0
#                     b.right.color = 0
#                     self.left_rotate(x.parent)
#                     x = self.root
#             else:
#                 # considering the right hand side
#                 b = x.parent.left
#                 if b.color == 1:
#                     b.color = 0
#                     x.parent.color = 1
#                     self.right_rotate(x.parent)
#                     b = x.parent.left
#                 if b.right.color == 0 and b.right.color == 0:
#                     b.color = 1
#                     x = x.parent
#                 else: 
#                     if b.left.color == 0:
#                         b.right.color = 0
#                         b.color = 1
#                         self.left_rotate(b)
#                         b = x.parent.left
#                     b.color = x.parent.color
#                     x.parent.color = 0
#                     b.left.color = 0
#                     self.right_rotate(x.parent)
#                     x = self.root
#             x.color = 0


# if __name__ == "__main__":
#     bst = RedBlackTree()
#     bst.insert(56)
#     bst.insert(40)
#     bst.insert(66)
#     bst.insert(59)
#     bst.insert(75)
#     bst.insert(57)

#     bst.print_tree()

#     print("/n After Deleting an element")
#     bst.delete_node(40)
#     bst.print_tree()


# class LinearSearch:

#     def __init__(self, search_arr, target):
#         self.search_arr = search_arr
#         self.target = target

#     def sequential(self):
#         arr_len = len(self.search_arr)

#         for index in range(arr_len):
#             if self.search_arr[index] == self.target:
#                 return index
#         return -1

# if __name__ == "__main__":
#     search_arr = [10, 29, 12, 23, 45, 22, 7]
#     target = 99
#     ls = LinearSearch(search_arr, target)
#     position = ls.sequential()
#     if position == -1:
#         print("not found")
#     else:
#         print(f"the target value {target} is located at index {position}")

# class Node:

#     def __init__(self, key):
#         self.root = key
#         self.left = None
#         self.right = None

#     """tranversal using pre-order"""
#     def  preOrder(self):
#         """pre order traversal"""
#         print(self.root, end=' ')
#         if self.left:
#             self.left.preOrder()
#         if self.right:
#             self.right.preOrder()

#     """tranversal using in-order"""
#     def inOrder(self):
#         if self.left:
#             self.left.inOrder()
#         print(self.root, end=' ')
#         if self.right:
#             self.right.inOrder()

#     def postOrder(self):
#         """post order traversal"""
#         if self.left:
#             self.left.postOrder()
#         if self.right:
#             self.right.postOrder()
#         print(self.root, end=' ')


# root = Node(1)
# root.left = Node(2)
# root.right = Node(3)
# root.right.left = Node(5)
# root.right.left.left = Node(7)
# root.right.left.right = Node(8)
# root.right.right = Node(6)

# root.left.left = Node(4)


# print("pre-order traversal")
# root.preOrder()

# print("\n In-order traversal")
# root.inOrder()

# print("\n Post-Order traversal")
# root.postOrder()


# class SelectionSort:

#     def __init__(self, unsorted_arr):
#         # set/initialize/declare the array for sorting
#         self.arr = unsorted_arr

#     def selection_sort(self):
#         # get the length of the array
#         n = len(self.arr)

#         # selection part with i pointing the index for selection
#         # i refere the selection part for the selected element
#         for i in range(n-1):
#             # assume that the current position holds the min elements
#             min_index = i

#             # iterate through the unsorted part
#             for j in range(i + 1, n):

#                 if self.arr[j] < self.arr[min_index]:
#                     # update the min index
#                     min_index = j
#             self.arr[i], self.arr[min_index] = self.arr[min_index], self.arr[i]

#         return self.arr


# # entry points for the selection sort
# if __name__ == "__main__":
#     arr = [64, 0, 12, 0, 11]
#     print(f"unsorted arr: {arr}")
#     # called the sorting class
#     ss = SelectionSort(arr)
#     sorted_arr = ss.selection_sort()
#     print(f"sorted arr: {sorted_arr}")


# # recursion
# def quickSort(arr):
#     if len(arr) <= 1:
#         return arr
#     pivot = arr[0]
#     #  left handside for those element less than the pivot
#     left_arr = []
#     # right handside for those greater than the pivot
#     right_arr = []

#     # loop through the array or sub-array
#     for index in range(1, len(arr)):
#         # check those element less than pivot
#         if arr[index] < pivot:
#             # put in the left hand side or left array
#             left_arr.append(arr[index])
#         # check those element greater than pivot
#         else:
#             # put in the right hand side or right array
#             right_arr.append(arr[index])

#     # recursively sort
#     return quickSort(left_arr) + list([pivot]) + quickSort(right_arr)

# arr = [7, 2, 1, 6, 8, 5, 3, 4]
# sorted_arr = quickSort(arr=arr)
# print(sorted_arr)
