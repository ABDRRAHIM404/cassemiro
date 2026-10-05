"""Inject a native X11 key only into the checker's private virtual display."""
import argparse
import ctypes
import os

parser = argparse.ArgumentParser()
parser.add_argument("key", choices=["Tab", "Return", "space"])
parser.add_argument("--shift", action="store_true")
args = parser.parse_args()
assert os.environ.get("GSETTINGS_BACKEND") == "memory"
assert "/cassemiro-orca-" in os.environ.get("XDG_RUNTIME_DIR", "")
assert os.environ.get("DISPLAY", "").startswith(":")

x11 = ctypes.CDLL("libX11.so.6")
xtest = ctypes.CDLL("libXtst.so.6")
x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
x11.XOpenDisplay.restype = ctypes.c_void_p
x11.XStringToKeysym.argtypes = [ctypes.c_char_p]
x11.XStringToKeysym.restype = ctypes.c_ulong
x11.XKeysymToKeycode.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
x11.XKeysymToKeycode.restype = ctypes.c_uint
x11.XSync.argtypes = [ctypes.c_void_p, ctypes.c_int]
x11.XCloseDisplay.argtypes = [ctypes.c_void_p]
xtest.XTestFakeKeyEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
display = x11.XOpenDisplay(os.environ["DISPLAY"].encode())
assert display
try:
    key = x11.XKeysymToKeycode(display, x11.XStringToKeysym(args.key.encode()))
    shift = x11.XKeysymToKeycode(display, x11.XStringToKeysym(b"Shift_L"))
    assert key and shift
    if args.shift:
        assert xtest.XTestFakeKeyEvent(display, shift, 1, 0)
    assert xtest.XTestFakeKeyEvent(display, key, 1, 0)
    assert xtest.XTestFakeKeyEvent(display, key, 0, 0)
    if args.shift:
        assert xtest.XTestFakeKeyEvent(display, shift, 0, 0)
    x11.XSync(display, 0)
finally:
    x11.XCloseDisplay(display)
