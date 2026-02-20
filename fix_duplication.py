
path = r"c:\Users\agape_ibeel\Desktop\Milkyway JAPAN\src\pages\AdminReservationManage.tsx"

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# We want to keep lines 0 to 917 (1-based 1 to 918)
# Line 919 (index 918) matches "customerName: string;"
# We want to delete from index 918 up to index 1852 (1-based 1853)
# Line 1854 (index 1853) matches "    const handleUpdateReservation..."

# Let's verify the content to be safe
print(f"Line 919 content: {lines[918]}")
print(f"Line 1854 content: {lines[1853]}")

# If correct, slice.
# Keep 0 to 918 (exclusive of 918? No, slice [0:918] keeps 0..917.
# We want to keep line 918 (index 917). So slice [0:918].
# Then skip from 918 to 1853.
# Resume at 1853.

new_lines = lines[0:918] + lines[1853:]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File updated.")
