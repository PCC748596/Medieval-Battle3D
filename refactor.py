import re

warrior_file = "public/js/warrior.js"
with open(warrior_file, "r") as f:
    content = f.read()

# Replace this.mesh stuff with this.x,y,z
content = content.replace("this.mesh.position.x", "this.x")
content = content.replace("this.mesh.position.y", "this.y")
content = content.replace("this.mesh.position.z", "this.z")
content = content.replace("this.mesh.rotation.x", "this.rotX")
content = content.replace("this.mesh.rotation.y", "this.rotY")
content = content.replace("this.mesh.rotation.z", "this.rotZ")

with open(warrior_file, "w") as f:
    f.write(content)

