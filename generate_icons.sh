#!/bin/bash
IMG="/home/aryan/.gemini/antigravity/brain/f5591afa-07ff-44a3-a163-ded3ba6c2f9a/.user_uploaded/media_1790738367896.jpg"
RES_DIR="android/app/src/main/res"

# Generate regular icons
convert "$IMG" -resize 48x48! "$RES_DIR/mipmap-mdpi/ic_launcher.png"
convert "$IMG" -resize 72x72! "$RES_DIR/mipmap-hdpi/ic_launcher.png"
convert "$IMG" -resize 96x96! "$RES_DIR/mipmap-xhdpi/ic_launcher.png"
convert "$IMG" -resize 144x144! "$RES_DIR/mipmap-xxhdpi/ic_launcher.png"
convert "$IMG" -resize 192x192! "$RES_DIR/mipmap-xxxhdpi/ic_launcher.png"

# Generate round icons
convert "$IMG" -resize 48x48! "$RES_DIR/mipmap-mdpi/ic_launcher_round.png"
convert "$IMG" -resize 72x72! "$RES_DIR/mipmap-hdpi/ic_launcher_round.png"
convert "$IMG" -resize 96x96! "$RES_DIR/mipmap-xhdpi/ic_launcher_round.png"
convert "$IMG" -resize 144x144! "$RES_DIR/mipmap-xxhdpi/ic_launcher_round.png"
convert "$IMG" -resize 192x192! "$RES_DIR/mipmap-xxxhdpi/ic_launcher_round.png"

# Generate foreground for adaptive icons (anydpi-v26)
convert "$IMG" -resize 108x108! "$RES_DIR/mipmap-mdpi/ic_launcher_foreground.png"
convert "$IMG" -resize 162x162! "$RES_DIR/mipmap-hdpi/ic_launcher_foreground.png"
convert "$IMG" -resize 216x216! "$RES_DIR/mipmap-xhdpi/ic_launcher_foreground.png"
convert "$IMG" -resize 324x324! "$RES_DIR/mipmap-xxhdpi/ic_launcher_foreground.png"
convert "$IMG" -resize 432x432! "$RES_DIR/mipmap-xxxhdpi/ic_launcher_foreground.png"

echo "Icons generated successfully."
