"""
Bumps the grammar version.

Usage: booi scripts/bumpversion.boo <major|minor|patch|X.Y.Z> [--dry-run]

.bumpversion.toml holds current_version and names the files carrying it:

	[bumpversion]
	current_version = "0.1.0"

	[[file]]
	path = "package.json"
	search = '"version": "{current_version}"'
	replace = '"version": "{new_version}"'

search and replace are literal text, not patterns, and default to the
placeholder alone. Only the TOML shown above is understood: two tables, and
single-line basic or literal strings.

Nothing is written unless every entry matched, so a rename cannot leave the
version half bumped.

Run from the root of a clone.
"""

import System
import System.IO
import System.Collections.Generic

class Entry:
	[property(Path)] path as string
	[property(Search)] search as string
	[property(Replace)] replace as string

CONFIG = ".bumpversion.toml"

def Fail(message as string):
	Console.Error.WriteLine("bumpversion: $message")
	Environment.Exit(2)

# Cuts a trailing comment, leaving any # that sits inside quotes alone.
def StripComment(raw as string) as string:
	quote = char('\0')
	i = 0
	while i < len(raw):
		c = raw[i]
		if quote != char('\0'):
			quote = char('\0') if c == quote
		elif c == char('"') or c == char('\''):
			quote = c
		elif c == char('#'):
			return raw[:i]
		i += 1
	return raw

def Unquote(raw as string, where as string) as string:
	value = StripComment(raw).Trim()
	Fail("$CONFIG: $where is not a quoted string") if len(value) < 2
	head = value[0]
	unless head == value[len(value) - 1] and (head == char('"') or head == char('\'')):
		Fail("$CONFIG: $where is not a quoted string")
	return value[1:-1]

def ReadConfig(path as string):
	version as string = null
	files = List[of Entry]()
	table as string = null
	current as Entry = null
	for raw in File.ReadAllLines(path):
		line = raw.Trim()
		continue if line == "" or line.StartsWith("#")
		if line == "[[file]]":
			table = "file"
			current = Entry(Search: "{current_version}", Replace: "{new_version}")
			files.Add(current)
		elif line == "[bumpversion]":
			table = "bumpversion"
			current = null
		elif line.StartsWith("["):
			Fail("$CONFIG: unknown table $line")
		else:
			at = line.IndexOf(char('='))
			Fail("$CONFIG: '$line' is not key = value") if at < 0
			key = line[:at].Trim()
			value = Unquote(line[at + 1:], key)
			if table == "bumpversion":
				Fail("$CONFIG: unknown key '$key' under [bumpversion]") if key != "current_version"
				version = value
			elif key == "path":
				current.Path = value
			elif key == "search":
				current.Search = value
			elif key == "replace":
				current.Replace = value
			else:
				Fail("$CONFIG: unknown key '$key' under [[file]]")
	Fail("$CONFIG has no [bumpversion] current_version") if version is null
	Fail("$CONFIG names no files") if len(files) == 0
	for f as Entry in files:
		Fail("$CONFIG: a [[file]] needs a path") if f.Path is null
	return version, files

def ParseVersion(text as string) as (int):
	parts = text.Trim().Split(char('.'))
	Fail("cannot read a X.Y.Z version from '$text'") if len(parts) != 3
	numbers = List[of int]()
	for p in parts:
		value as int
		Fail("cannot read a X.Y.Z version from '$text'") unless int.TryParse(p, value)
		numbers.Add(value)
	return numbers.ToArray()

Fail("$CONFIG not found. Run from the root of a clone.") unless File.Exists(CONFIG)

dryRun = "--dry-run" in argv
args = array(a for a in argv if not a.StartsWith("--"))
Fail("usage: bumpversion <major|minor|patch|X.Y.Z> [--dry-run]") if len(args) != 1

current, files = ReadConfig(CONFIG)
parts = ParseVersion(current)

bump = args[0]
if bump == "major":
	next = "$(parts[0] + 1).0.0"
elif bump == "minor":
	next = "$(parts[0]).$(parts[1] + 1).0"
elif bump == "patch":
	next = "$(parts[0]).$(parts[1]).$(parts[2] + 1)"
else:
	ParseVersion(bump)
	next = bump.Trim()

Fail("already at $next") if next == current

print "$current -> $next"

# Staged per path so nothing is written until every entry has matched, and so
# two entries touching one file both survive.
staged = Dictionary[of string, string]()
order = List[of string]()
failed = false

for entry as Entry in files:
	search = entry.Search.Replace("{current_version}", current).Replace("{new_version}", next)
	replace = entry.Replace.Replace("{current_version}", current).Replace("{new_version}", next)

	unless File.Exists(entry.Path):
		Console.Error.WriteLine("  missing   ${entry.Path}")
		failed = true
		continue

	unless staged.ContainsKey(entry.Path):
		staged[entry.Path] = File.ReadAllText(entry.Path)
		order.Add(entry.Path)

	text = staged[entry.Path]
	unless text.Contains(search):
		Console.Error.WriteLine("  no match  ${entry.Path}")
		failed = true
		continue
	staged[entry.Path] = text.Replace(search, replace)

Fail("nothing was written") if failed

for path in order:
	if dryRun:
		print "  would write $path"
	else:
		File.WriteAllText(path, staged[path])
		print "  wrote     $path"

unless dryRun:
	text = File.ReadAllText(CONFIG)
	File.WriteAllText(CONFIG, text.Replace(
		'current_version = "' + current + '"', 'current_version = "' + next + '"'))
	print "  wrote     $CONFIG"
