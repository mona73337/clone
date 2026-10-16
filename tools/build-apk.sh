#!/usr/bin/env bash
# Builds Clone without Gradle, straight from the SDK tools (aapt2 + javac + d8/dx + apksigner).
# This is how the prebuilt APK was produced. For day-to-day work use Gradle: ./gradlew assembleRelease
#
# Example with a standard SDK install:
#   B=$ANDROID_HOME/build-tools/35.0.0
#   ANDROID_JAR=$ANDROID_HOME/platforms/android-35/android.jar AAPT2=$B/aapt2 DEXER=d8 \
#   KEYSTORE=clone-release.p12 KEYSTORE_PASSWORD=... PATH=$B:$PATH ./tools/build-apk.sh
#
# Environment:
#   ANDROID_JAR   android.jar for API 35
#   AAPT2         aapt2 binary
#   DEXER         "d8" (from build-tools, on PATH) or a path to dx.jar
#   KEYSTORE + KEYSTORE_PASSWORD (+ KEY_ALIAS, default "clone")  → signs with apksigner from PATH
#   or SIGN_CMD   any command used as: SIGN_CMD <in.apk> <out.apk>
# Optional: VERSION_NAME (default 1.0.0), VERSION_CODE (default 1), OUT (default build/clone.apk)
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION_NAME="${VERSION_NAME:-1.0.0}"
VERSION_CODE="${VERSION_CODE:-1}"
OUT="${OUT:-build/clone.apk}"
SRC=app/src/main
B=build/manual
rm -rf "$B" && mkdir -p "$B/gen" "$B/classes" "$(dirname "$OUT")"

echo "› catalog"
python3 data/build_catalog.py >/dev/null 2>&1 || echo "  (catalog sources not present — using bundled catalog.json)"

echo "› resources"
sed 's#<manifest xmlns:android="http://schemas.android.com/apk/res/android">#<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="app.clone">#' \
  "$SRC/AndroidManifest.xml" > "$B/AndroidManifest.xml"
"$AAPT2" compile --dir "$SRC/res" -o "$B/res.zip"
"$AAPT2" link -I "$ANDROID_JAR" --manifest "$B/AndroidManifest.xml" -A "$SRC/assets" \
  --min-sdk-version 24 --target-sdk-version 35 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  --java "$B/gen" -o "$B/base.apk" "$B/res.zip"

echo "› java"
javac -nowarn -Xlint:-options -encoding UTF-8 -source 8 -target 8 -bootclasspath "$ANDROID_JAR" \
  -d "$B/classes" $(find "$SRC/java" "$B/gen" -name '*.java')

echo "› dex"
if [ "$DEXER" = "d8" ]; then
  d8 --release --min-api 24 --lib "$ANDROID_JAR" --output "$B" $(find "$B/classes" -name '*.class')
else
  java -jar "$DEXER" --dex --min-sdk-version=24 --output="$B/classes.dex" "$B/classes"
fi

echo "› package & sign"
cp "$B/base.apk" "$B/unsigned.apk"
(cd "$B" && zip -q -j unsigned.apk classes.dex)
python3 tools/zipalign.py "$B/unsigned.apk" "$B/aligned.apk"
if [ -n "${SIGN_CMD:-}" ]; then
  $SIGN_CMD "$B/aligned.apk" "$OUT"
else
  apksigner sign --ks "$KEYSTORE" --ks-pass env:KEYSTORE_PASSWORD --ks-key-alias "${KEY_ALIAS:-clone}" \
    --min-sdk-version 24 --out "$OUT" "$B/aligned.apk"
fi
python3 tools/zipalign.py --check "$OUT"
echo "✓ $OUT ($(du -h "$OUT" | cut -f1))"
