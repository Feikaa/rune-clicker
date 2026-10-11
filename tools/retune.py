# Balancing helper: rewrite (value, base, growth, max) of upgrade lines in js/data.js.
# Usage: python3 tools/retune.py id=value,base,growth,max ...   (use _ to keep a field)
import re, sys
p = 'js/data.js'; s = open(p).read()
for arg in sys.argv[1:]:
    i, vals = arg.split('=')
    v, b, g, mx = vals.split(',')
    line = re.search(r".*\{ id: '%s',.*" % i, s).group(0)
    new = line
    if b != '_': new = re.sub(r"base: [\d.]+", f"base: {b}", new)
    if g != '_': new = re.sub(r"growth: [\d.]+", f"growth: {g}", new)
    if mx != '_': new = re.sub(r"max: \d+", f"max: {mx}", new)
    if v != '_': new = re.sub(r"(effects: \[\{ stat: '\w+', op: '\w+', v: )[\d.]+", lambda m: m.group(1) + v, new)
    s = s.replace(line, new)
open(p, 'w').write(s)
