"""Run the installed Orca CLI with unbuffered diagnostic stderr, not a fake AT."""
import runpy
import sys
from orca import debug

# Same diagnostic levels as Orca's --debug option, but no separately buffered
# debug file. python -u makes its normal stderr writes observable immediately.
debug.debugLevel = debug.LEVEL_ALL
debug.eventDebugLevel = debug.LEVEL_OFF
sys.argv = ["/usr/bin/orca", *sys.argv[1:]]
runpy.run_path("/usr/bin/orca", run_name="__main__")
