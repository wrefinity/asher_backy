class SelectionSort:
    
    def __init__(self, unsorted_arr):
        # set/initialize/declare the array for sorting
        self.arr = unsorted_arr
    
    def selection_sort(self):
        # get the length of the array
        n = len(self.arr)

        # selection part with i pointing the index for selection
        # i references the selection part for the selected element
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

    