$adb = "C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$summary = "C:\Users\LENOVO\.codex\plugins\cache\openai-curated\test-android-apps\9b3c8689\skills\android-emulator-qa\scripts\ui_tree_summarize.py"

function Dump($name) {
  & $adb -s emulator-5554 exec-out uiautomator dump /dev/tty | Out-File -Encoding utf8 ".codex_qa\$name.xml"
  py $summary ".codex_qa\$name.xml" ".codex_qa\$name.txt"
  Write-Host "==== $name ===="
  Get-Content ".codex_qa\$name.txt"
}

function Tap($x, $y) {
  & $adb -s emulator-5554 shell input tap $x $y
  Start-Sleep -Milliseconds 900
}

function SwipeUp() {
  & $adb -s emulator-5554 shell input swipe 540 1900 540 550 500
  Start-Sleep -Milliseconds 900
}

function Back() {
  & $adb -s emulator-5554 shell input keyevent 4
  Start-Sleep -Milliseconds 900
}

# Clear modals / return to home.
Back
Back
Tap 116 2232
Dump "tools-top"

# Clean paywall.
Tap 860 158
Dump "paywall-clean"
Back

# Scroll tool list.
Tap 116 2232
SwipeUp
Dump "tools-mid"
SwipeUp
Dump "tools-bottom"

# Open visible special tools from lower list.
# Approx cards after two swipes: Layout / Replace / Reference are usually visible.
Tap 340 780
Dump "special-1-step1"
Back
Tap 340 1240
Dump "special-2-step1"
Back
Tap 340 1710
Dump "special-3-step1"
Back
