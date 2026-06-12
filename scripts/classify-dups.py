import os, subprocess

def run(args):
    return subprocess.run(args, capture_output=True, text=True).stdout.strip()

tracked = set(run(['git', 'ls-files']).splitlines())

dups = []
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', '.git', 'exports', '.claude')]
    for f in files:
        if ' (1)' in f:
            p = os.path.join(root, f).replace(os.sep, '/')
            dups.append(p[2:] if p.startswith('./') else p)

report = {'DELETE_IDENTICAL': [], 'DELETE_STALE': [], 'RENAME': [], 'REVIEW': [], 'GIT_RM': []}

for dup in sorted(dups):
    d, base = os.path.split(dup)
    counterpart = (d + '/' if d else '') + base.replace(' (1)', '')

    if dup in tracked:
        report['GIT_RM'].append(dup)
        continue

    if not os.path.exists(counterpart):
        report['RENAME'].append((dup, counterpart))
        continue

    with open(dup, 'rb') as f:
        b1 = f.read()
    with open(counterpart, 'rb') as f:
        b2 = f.read()
    if b1 == b2 or b1.replace(b'\r\n', b'\n') == b2.replace(b'\r\n', b'\n'):
        report['DELETE_IDENTICAL'].append(dup)
        continue

    # czy zawartość (1) odpowiada jakiejś wersji z historii gita?
    blob = run(['git', 'hash-object', '--path', counterpart, dup])
    in_hist = subprocess.run(['git', 'cat-file', '-e', blob], capture_output=True).returncode == 0
    if in_hist:
        commit = run(['git', 'log', '--format=%h %s', '--find-object=' + blob, '-1', '--all'])
        report['DELETE_STALE'].append((dup, commit))
    else:
        report['REVIEW'].append(dup)

for k, items in report.items():
    print(f'\n=== {k} ({len(items)}) ===')
    for it in items:
        print(' ', it)
