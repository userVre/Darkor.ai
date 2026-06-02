import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

ADB = r"C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe"
SERIAL = "emulator-5554"
PKG = "com.ismail.homedecorai"
ACTIVITY = "com.ismail.homedecorai.MainActivity"
OUT = Path(".codex_qa/recheck")
OUT.mkdir(parents=True, exist_ok=True)


def run(args, timeout=30, text=True):
    return subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout, text=text)


def adb(*args, timeout=30, text=True):
    return run([ADB, "-s", SERIAL, *args], timeout=timeout, text=text)


def tap(x, y, delay=0.8):
    adb("shell", "input", "tap", str(int(x)), str(int(y)))
    time.sleep(delay)


def swipe(x1, y1, x2, y2, ms=450, delay=0.8):
    adb("shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(ms))
    time.sleep(delay)


def back(delay=0.8):
    adb("shell", "input", "keyevent", "4")
    time.sleep(delay)


def launch():
    adb("shell", "am", "start", "-n", f"{PKG}/{ACTIVITY}")
    time.sleep(1.2)


def bounds_center(bounds):
    nums = [int(n) for n in re.findall(r"\d+", bounds or "")]
    if len(nums) == 4:
        return ((nums[0] + nums[2]) // 2, (nums[1] + nums[3]) // 2)
    return None


def dump(name):
    adb("shell", "uiautomator", "dump", "/sdcard/window.xml")
    xml = adb("exec-out", "cat", "/sdcard/window.xml").stdout
    (OUT / f"{name}.xml").write_text(xml, encoding="utf-8", errors="replace")
    summary = []
    try:
        root = ET.fromstring(xml)
        for node in root.iter("node"):
            text = node.attrib.get("text", "")
            desc = node.attrib.get("content-desc", "")
            clickable = node.attrib.get("clickable") == "true"
            scrollable = node.attrib.get("scrollable") == "true"
            cls = node.attrib.get("class", "").split(".")[-1]
            if text or desc or clickable or scrollable:
                label = text or desc
                flags = []
                if clickable:
                    flags.append("click")
                if scrollable:
                    flags.append("scroll")
                summary.append(f"{cls:<18} {'/'.join(flags):<10} {node.attrib.get('bounds',''):<22} {label}")
    except Exception as exc:
        summary.append(f"PARSE_ERROR {exc}")
    (OUT / f"{name}.txt").write_text("\n".join(summary[:240]), encoding="utf-8")
    print(f"\n==== {name} ====")
    print("\n".join(summary[:120]))
    return xml


def find_node(label, xml=None):
    if xml is None:
        xml = dump("_tmp")
    try:
        root = ET.fromstring(xml)
    except Exception:
        return None
    label_l = label.lower()
    matches = []
    for node in root.iter("node"):
        text = node.attrib.get("text", "")
        desc = node.attrib.get("content-desc", "")
        hay = f"{text} {desc}".lower()
        if label_l in hay:
            center = bounds_center(node.attrib.get("bounds", ""))
            if center:
                matches.append((node, center))
    return matches[0] if matches else None


def tap_label(label, name_after=None, scroll_attempts=0):
    xml = dump(f"before-{safe(label)}")
    found = find_node(label, xml)
    for i in range(scroll_attempts):
        if found:
            break
        swipe(540, 1900, 540, 650)
        xml = dump(f"scroll-{safe(label)}-{i}")
        found = find_node(label, xml)
    if not found:
        print(f"MISS: {label}")
        return False
    _, (x, y) = found
    tap(x, y)
    if name_after:
        dump(name_after)
    return True


def safe(s):
    return re.sub(r"[^A-Za-z0-9_-]+", "-", s).strip("-")[:50]


def close_to_tools():
    adb("shell", "am", "force-stop", PKG)
    launch()
    # If the app restores into an active wizard, close it first.
    tap(980, 145, delay=0.4)
    tap(70, 2295)
    time.sleep(0.4)


def select_example_and_continue(flow):
    # Prefer an example card instead of opening gallery/camera.
    xml = dump(f"{flow}-photo")
    found = find_node("Utiliser un exemple", xml)
    if found:
        tap(*found[1], delay=0.5)
    # Tap first visible example around lower strip.
    tap(210, 1940, delay=0.5)
    tap(540, 2265, delay=0.9)


def continue_button():
    tap(540, 2265, delay=0.9)


def test_generic_flow(tool_label, flow, steps=4):
    close_to_tools()
    tap_label(tool_label, f"{flow}-step1", scroll_attempts=6)
    select_example_and_continue(flow)
    dump(f"{flow}-step2")
    # Select first option/chip/card then continue through style/refine without generating where possible.
    tap(250, 700, delay=0.5)
    continue_button()
    dump(f"{flow}-step3")
    tap(250, 700, delay=0.5)
    continue_button()
    dump(f"{flow}-step4-or-processing")
    # Do not intentionally trigger final paid generation if still on a generate screen.
    tap(980, 145, delay=0.8)


def test_mask_flow(tool_label, flow):
    close_to_tools()
    tap_label(tool_label, f"{flow}-step1", scroll_attempts=6)
    select_example_and_continue(flow)
    dump(f"{flow}-mask-empty")
    # Draw a simple mask stroke in the image area.
    swipe(390, 840, 650, 1060, 650, delay=0.5)
    dump(f"{flow}-mask-marked")
    continue_button()
    dump(f"{flow}-prompt")
    tap(250, 700, delay=0.5)
    dump(f"{flow}-prompt-selected")
    tap(980, 145, delay=0.8)


def test_reference():
    close_to_tools()
    tap_label("Transfert de style", "reference-step1", scroll_attempts=8)
    dump("reference-initial")
    # Try selecting examples for both image slots if exposed.
    tap_label("Utiliser un exemple", "reference-after-example-button", scroll_attempts=1)
    tap(210, 1940, delay=0.5)
    dump("reference-after-first-example")
    # Continue may be disabled unless second image exists; tap anyway to inspect feedback.
    continue_button()
    dump("reference-after-continue-attempt")
    tap(980, 145, delay=0.8)


def test_bottom_tabs():
    close_to_tools()
    dump("home-tools-top")
    tap(395, 2295)
    dump("elite-pass")
    tap(682, 2295)
    dump("discover")
    # Open a see-all/detail if present.
    tap_label("Voir tout", "discover-see-all", scroll_attempts=0)
    back()
    tap(967, 2295)
    dump("profile")
    tap(116, 158)
    dump("settings")
    back()
    tap(860, 158)
    dump("auth-sheet")
    back()
    tap(70, 2295)
    tap(850, 158)
    dump("paywall")
    tap_label("Acheter des diamants", "diamond-store", scroll_attempts=2)
    back()
    back()


def main():
    print(adb("devices").stdout)
    adb("logcat", "-c")
    test_bottom_tabs()
    test_generic_flow("Design d'intérieur", "interior")
    test_generic_flow("Conception extérieure", "exterior")
    test_generic_flow("Conception de jardin", "garden")
    test_mask_flow("Peinture intelligente", "paint")
    test_mask_flow("Relooking du sol", "floor")
    test_generic_flow("Agencement Intelligent", "layout", steps=3)
    test_mask_flow("Remplacer des objets", "replace")
    test_reference()
    crash = adb("logcat", "-b", "crash", "-d", "-t", "120").stdout
    (OUT / "crash-log.txt").write_text(crash, encoding="utf-8", errors="replace")
    print("\n==== crash-log-tail ====")
    print(crash[-5000:])


if __name__ == "__main__":
    main()
