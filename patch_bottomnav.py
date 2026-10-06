with open("src/components/layout/BottomNav.tsx", "r") as f:
    lines = f.readlines()

with open("src/components/layout/BottomNav.tsx", "w") as f:
    for line in lines:
        if "Excel Import" not in line:
            f.write(line)
