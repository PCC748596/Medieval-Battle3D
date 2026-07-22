with open('public/js/warrior.js', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "this.mesh = templateMeshes[this.faction][this.role].clone();" in line:
        skip = True
        new_lines.append("        this.baseColor = new THREE.Color(0xffffff);\n")
        new_lines.append("        if (this.isPusher) {\n")
        new_lines.append("            const colorHex = armies[this.faction].colorHex;\n")
        new_lines.append("            this.baseColor.setHex(colorHex);\n")
        new_lines.append("            this.scale = 1.15;\n")
        new_lines.append("        } else {\n")
        new_lines.append("            this.scale = 1.0;\n")
        new_lines.append("        }\n")
        new_lines.append("        this.visible = true;\n")
        continue

    if skip:
        if "getAvoidanceDir(dir)" in line:
            skip = False
            new_lines.append(line)
    else:
        new_lines.append(line)

with open('public/js/warrior.js', 'w') as f:
    f.writelines(new_lines)

