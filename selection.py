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

class Node:

    def __init__(self, key):
        self.root = key
        self.left = None
        self.right = None

    """tranversal using pre-order"""
    def  preOrder(self):
        """pre order traversal"""
        print(self.root, end=' ')
        if self.left:
            self.left.preOrder()
        if self.right:
            self.right.preOrder()
    
    """tranversal using in-order"""
    def inOrder(self):
        if self.left:
            self.left.inOrder()
        print(self.root, end=' ')
        if self.right:
            self.right.inOrder() 
    
    def postOrder(self):
        """post order traversal"""  
        if self.left:
            self.left.postOrder()
        if self.right:
            self.right.postOrder()
        print(self.root, end=' ')


root = Node(1)
root.left = Node(2)
root.right = Node(3)
root.right.left = Node(5)
root.right.left.left = Node(7)
root.right.left.right = Node(8)
root.right.right = Node(6)

root.left.left = Node(4)    


print("pre-order traversal")
root.preOrder()

print("\n In-order traversal")
root.inOrder()

print("\n Post-Order traversal")
root.postOrder()























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