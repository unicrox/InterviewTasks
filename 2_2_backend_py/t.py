one_list = [1, 2, 3, 4]
one_list_len = len(one_list)

output = [1] * one_list_len

before = 1
for i in range(one_list_len):
    output[i] = before
    before *= one_list[i]

after = 1
for i in range(one_list_len - 1, -1, -1):
    output[i] *= after
    after *= one_list[i]

print(output)