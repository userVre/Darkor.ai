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

# Profile settings.
Tap 967 2232
Tap 116 158
Dump "profile-settings"
Back

# Profile sign in button.
Tap 967 2232
Tap 853 158
Dump "profile-signin-tap"

# Home paywall and diamond store.
Tap 116 2232
Tap 860 158
Dump "paywall"
Back
Tap 116 158
Dump "diamond-store"
