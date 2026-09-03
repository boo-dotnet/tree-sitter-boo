# tree-sitter-boo

Boo grammar for [tree-sitter](https://tree-sitter.github.io), for editors that
get their syntax highlighting from tree-sitter rather than from a TextMate or
regex grammar. Helix and Zed are the two this was written against; the same
files work anywhere tree-sitter does.

The grammar tracks `src/Boo.Lang.Parser/BooLexer.g4` and `BooParser.g4` in the
[Boo compiler](https://github.com/boo-lang/boo). Where the two disagree the
ANTLR grammar wins, and the rule that settles it is named in a comment.

## Layout

    grammar.js          the grammar
    src/scanner.c       external scanner: INDENT, DEDENT, EOL
    src/parser.c        generated; committed because editors compile it directly
    queries/            highlights, indents, folds, brackets, textobjects, outline, locals, injections
    test/corpus/        parser regression tests

## Why there is C in here

Boo blocks are delimited by indentation, so a block ends when a line's column
drops below the column that opened it. That is a comparison against a stack of
previous columns, which is state carried between tokens, and `grammar.js` holds
no state and cannot see columns. tree-sitter's answer is an external scanner,
and external scanners are C or C++ only: Helix looks for `src/scanner.c` or
`src/scanner.cc` and compiles it, and supports neither a Rust crate nor a
prebuilt library.

`src/scanner.c` mirrors `Boo.Lang.Parser.Util.IndentTokenStreamFilter`: a run of
whitespace collapses to the indent of the next line that carries real code, so
blank lines and comment-only lines never open or close a block; a dedent emits
`EOL` before its `DEDENT`s; and end of file closes every block still open.

## The end keyword

`end` closes the innermost open block, wherever it appears, and no dialect flag
switches that on. Two shapes are recognised:

    class Foo:              def f():
      new def Bar():          if x:
      end                       g()
    end                       end
                            end

`end` sits at the indent of the header that opened the block, so a body left
empty produces no `INDENT` at all and `end` stands in for the whole thing.

`end` is not reserved. The compiler's non-WSA path rewrites the token to a plain
identifier, and so does this grammar: `end = 2` and `return end - start` still
read as a variable, because the keyword is only recognised where a block can
close.

## Building

    npm install
    npm run generate
    npm test

## Parse rate

`tree-sitter parse -s <files>` reports a parse-success percentage, which is the
number to watch when changing the grammar. The corpus is every `.boo` file in
the compiler repository, so point it at a checkout:

    BOO=../boo
    npx tree-sitter parse -q -s $(fd -t f -e boo . \
      $BOO/examples $BOO/src $BOO/tests $BOO/scripts $BOO/extras)

Nothing is excluded. `tests/testcases/errors` is in the count because its files
carry semantic errors, not syntax errors, and so are expected to parse.

CI runs this on every push and fails if the rate drops below the floor in
`.github/workflows/ci.yml`.

## Helix

Add to `~/.config/helix/languages.toml`, with `rev` set to the commit you want:

```toml
[[language]]
name = "boo"
scope = "source.boo"
injection-regex = "^boo$"
file-types = ["boo"]
comment-tokens = ["#", "//"]
block-comment-tokens = { start = "/*", end = "*/" }
indent = { tab-width = 4, unit = "\t" }

[[grammar]]
name = "boo"
source = { git = "https://github.com/boo-dotnet/tree-sitter-boo", rev = "REPLACE_WITH_COMMIT" }
```

Then build the grammar and put the queries where Helix looks for them:

    hx --grammar fetch
    hx --grammar build
    mkdir -p ~/.config/helix/runtime/queries/boo
    cp queries/*.scm ~/.config/helix/runtime/queries/boo/

`hx --health boo` should then show a highlight, indent and textobject config.

## Zed

Zed wants an extension. Create a directory with an `extension.toml`:

```toml
id = "boo"
name = "Boo"
version = "0.1.0"
schema_version = 1
description = "Boo language support"

[grammars.boo]
repository = "https://github.com/boo-dotnet/tree-sitter-boo"
commit = "REPLACE_WITH_COMMIT"

[language_servers]
```

and a `languages/boo/config.toml`:

```toml
name = "Boo"
grammar = "boo"
path_suffixes = ["boo"]
line_comments = ["# ", "// "]
block_comment = ["/* ", " */"]
tab_size = 4
hard_tabs = true
autoclose_before = ";:.,=}])>"
```

Copy `queries/*.scm` into `languages/boo/`, then install it with
**zed: install dev extension** from the command palette.

## Query files

| File               | Used by      | Gives you                                           |
| ------------------ | ------------ | --------------------------------------------------- |
| `highlights.scm`   | both         | syntax highlighting                                 |
| `indents.scm`      | both         | indent on newline, reindent                         |
| `folds.scm`        | both         | fold blocks, bodies, collections                    |
| `brackets.scm`     | both         | matching bracket, autoclose                         |
| `injections.scm`   | both         | regex literals highlighted as regex                 |
| `locals.scm`       | Helix        | scope-aware highlighting and rename                 |
| `textobjects.scm`  | Helix        | `mif`, `maf`, `mic`, `mac`, parameter selection     |
| `outline.scm`      | Zed          | outline panel and breadcrumbs                       |

## Known gaps

- Nested block comments (`/* a /* b */ c */`) are lexed only to the first `*/`.
  The scanner nests correctly, so the indent is still right, but `grammar.js`
  cannot match a nesting comment with a regex and the tail reads as code.
- A block comment at the start of a line followed by code on that same line
  loses the statement separator, because the scanner gives the `/` back to the
  grammar and the newline behind it is then trivia.
- A macro body holding a member declaration with a modifier (`override def f():`
  inside `myclass Foo:`) does not parse. `BooParser.g4` allows it through
  `any_macro_stmt`, but a `macro_block` rule cannot be told apart from an
  ordinary `block` until several tokens in.
- What still errors is mostly quasi-quoted member declarations and
  macro-generated members. `tree-sitter parse -q <files>` lists them.
