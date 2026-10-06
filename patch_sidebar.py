with open("src/components/layout/Sidebar.tsx", "r") as f:
    lines = f.readlines()

with open("src/components/layout/Sidebar.tsx", "w") as f:
    for line in lines:
        if "Excel Import" not in line:
            f.write(line)
