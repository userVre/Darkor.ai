$adb = "C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$summary = "C:\Users\LENOVO\.codex\plugins\cache\openai-curated\test-android-apps\9b3c8689\skills\android-emulator-qa\scripts\ui_tree_summarize.py"

function Dump($name) {
  & $adb -s emulator-5554 exec-out uiautomator dump /dev/tty | Out-File -Encoding utf8 ".codex_qa\$name.xml"
  py $summary ".codex_qa\$name.xml" ".codex_qa\$name.txt"
  Write-Host "==== $name ===="
  if (Test-Path ".codex_qa\$name.txt") { Get-Content ".codex_qa\$name.txt" }
}

function Tap($x, $y) {
  & $adb -s emulator-5554 shell input tap $x $y
  Start-Sleep -Milliseconds 900
}

function SwipeUp() {
  & $adb -s emulator-5554 shell input swipe 540 1900 540 600 450
  Start-Sleep -Milliseconds 900
}

function Back() {
  & $adb -s emulator-5554 shell input keyevent 4
  Start-Sleep -Milliseconds 900
}

& $adb -s emulator-5554 shell am start -n com.ismail.homedecorai/.MainActivity
Start-Sleep -Milliseconds 1200
Tap 116 2232
Dump "tools-relaunch-top"

SwipeUp
Dump "tools-relaunch-mid"
SwipeUp
Dump "tools-relaunch-bottom"
