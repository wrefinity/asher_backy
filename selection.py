class SelectionSort:
    
    def __init__(self, unsorted_arr):
        # set/initialize/declare the array for sorting
        self.arr = unsorted_arr
    
    def selection_sort(self):
        # get the length of the array
        n = len(self.arr)

        # selection part with i pointing the index for selection
        # i refere the selection part for the selected element
        for i in range(n-1):
            # assume that the current position holds the min elements
            min_index = i

            # iterate through the unsorted part
            for j in range(i + 1, n):

                if self.arr[j] < self.arr[min_index]:
                    # update the min index 
                    min_index = j
            self.arr[i], self.arr[min_index] = self.arr[min_index], self.arr[i]
        
        return self.arr


# entry points for the selection sort
if __name__ == "__main__":
    arr = [64, 0, 12, 0, 11]
    print(f"unsorted arr: {arr}")
    # called the sorting class
    ss = SelectionSort(arr)
    sorted_arr = ss.selection_sort()
    print(f"sorted arr: {sorted_arr}")



# recursion 
def quickSort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[0]
    #  left handside for those element less than the pivot
    left_arr = []
    # right handside for those greater than the pivot
    right_arr = []

    # loop through the array or sub-array
    for index in range(1, len(arr)):
        # check those element less than pivot
        if arr[index] < pivot:
            # put in the left hand side or left array
            left_arr.append(arr[index])
        # check those element greater than pivot
        else:
            # put in the right hand side or right array
            right_arr.append(arr[index])
    
    # recursively sort
    return quickSort(left_arr) + list([pivot]) + quickSort(right_arr) 

arr = [7, 2, 1, 6, 8, 5, 3, 4] 
sorted_arr = quickSort(arr=arr)
print(sorted_arr)