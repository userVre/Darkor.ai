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

function Back() {
  & $adb -s emulator-5554 shell input keyevent 4
  Start-Sleep -Milliseconds 900
}

Tap 398 2232
Dump "elite"
Tap 682 2232
Dump "discover"
Tap 967 2232
Dump "profile"
