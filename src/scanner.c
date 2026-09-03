#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"

#include <string.h>

// Mirrors Boo.Lang.Parser.Util.IndentTokenStreamFilter: a run of whitespace
// collapses to the indent of the next line carrying real code.

enum TokenType {
  NEWLINE,
  INDENT,
  DEDENT,
};

#define MAX_DEPTH 256

typedef struct {
  uint16_t indents[MAX_DEPTH];
  uint16_t depth;
  uint16_t indent_value;
  uint16_t dedents_pending;
  uint8_t newline_pending;
  uint8_t indent_pending;
  uint8_t eof_done;
} Scanner;

static inline uint16_t current_indent(const Scanner *s) {
  return s->indents[s->depth - 1];
}

static void clear_pending(Scanner *s) {
  s->newline_pending = 0;
  s->indent_pending = 0;
  s->dedents_pending = 0;
}

void *tree_sitter_boo_external_scanner_create(void) {
  Scanner *s = ts_malloc(sizeof(Scanner));
  memset(s, 0, sizeof(Scanner));
  s->indents[0] = 0;
  s->depth = 1;
  return s;
}

void tree_sitter_boo_external_scanner_destroy(void *payload) {
  ts_free(payload);
}

unsigned tree_sitter_boo_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *s = (Scanner *)payload;
  unsigned size = 0;

  buffer[size++] = (char)s->newline_pending;
  buffer[size++] = (char)s->indent_pending;
  buffer[size++] = (char)s->eof_done;
  memcpy(buffer + size, &s->indent_value, sizeof(uint16_t));
  size += sizeof(uint16_t);
  memcpy(buffer + size, &s->dedents_pending, sizeof(uint16_t));
  size += sizeof(uint16_t);

  uint16_t depth = s->depth;
  unsigned room = (TREE_SITTER_SERIALIZATION_BUFFER_SIZE - size - sizeof(uint16_t)) / sizeof(uint16_t);
  if (depth > room) depth = (uint16_t)room;
  memcpy(buffer + size, &depth, sizeof(uint16_t));
  size += sizeof(uint16_t);
  memcpy(buffer + size, s->indents, depth * sizeof(uint16_t));
  size += depth * sizeof(uint16_t);

  return size;
}

void tree_sitter_boo_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *s = (Scanner *)payload;
  memset(s, 0, sizeof(Scanner));
  s->indents[0] = 0;
  s->depth = 1;

  if (length == 0) return;

  unsigned size = 0;
  s->newline_pending = (uint8_t)buffer[size++];
  s->indent_pending = (uint8_t)buffer[size++];
  s->eof_done = (uint8_t)buffer[size++];
  memcpy(&s->indent_value, buffer + size, sizeof(uint16_t));
  size += sizeof(uint16_t);
  memcpy(&s->dedents_pending, buffer + size, sizeof(uint16_t));
  size += sizeof(uint16_t);

  uint16_t depth = 0;
  memcpy(&depth, buffer + size, sizeof(uint16_t));
  size += sizeof(uint16_t);
  if (depth > MAX_DEPTH) depth = MAX_DEPTH;
  if (depth > 0) {
    memcpy(s->indents, buffer + size, depth * sizeof(uint16_t));
    s->depth = depth;
  }
}

static void advance_to_end_of_line(TSLexer *lexer) {
  while (!lexer->eof(lexer) && lexer->lookahead != '\n' && lexer->lookahead != '\r') {
    lexer->advance(lexer, false);
  }
}

// ML_COMMENT in BooLexer.g4 nests, which no regex in grammar.js can match.
static void advance_past_block_comment(TSLexer *lexer) {
  unsigned depth = 1;
  while (depth > 0 && !lexer->eof(lexer)) {
    if (lexer->lookahead == '*') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '/') {
        lexer->advance(lexer, false);
        depth--;
      }
    } else if (lexer->lookahead == '/') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '*') {
        lexer->advance(lexer, false);
        depth++;
      }
    } else {
      lexer->advance(lexer, false);
    }
  }
}

// Reports false when the '/' opened neither comment form.
static bool advance_past_comment(TSLexer *lexer) {
  if (lexer->lookahead == '#') {
    advance_to_end_of_line(lexer);
    return true;
  }

  lexer->advance(lexer, false);
  if (lexer->lookahead == '/') {
    advance_to_end_of_line(lexer);
    return true;
  }
  if (lexer->lookahead == '*') {
    lexer->advance(lexer, false);
    advance_past_block_comment(lexer);
    return true;
  }
  return false;
}

static bool serve_pending(Scanner *s, TSLexer *lexer, const bool *valid_symbols) {
  if (s->newline_pending && valid_symbols[NEWLINE]) {
    s->newline_pending = 0;
    lexer->result_symbol = NEWLINE;
    return true;
  }

  if (s->indent_pending && valid_symbols[INDENT]) {
    s->newline_pending = 0;
    s->indent_pending = 0;
    if (s->depth < MAX_DEPTH) s->indents[s->depth++] = s->indent_value;
    lexer->result_symbol = INDENT;
    return true;
  }

  if (s->dedents_pending > 0 && valid_symbols[DEDENT]) {
    s->newline_pending = 0;
    s->dedents_pending--;
    if (s->depth > 1) s->depth--;
    lexer->result_symbol = DEDENT;
    return true;
  }

  return false;
}

bool tree_sitter_boo_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *s = (Scanner *)payload;

  if (s->newline_pending || s->indent_pending || s->dedents_pending) {
    if (serve_pending(s, lexer, valid_symbols)) return true;
    // The parser wants none of what we held back, so stop replaying it.
    clear_pending(s);
    return false;
  }

  if (!valid_symbols[NEWLINE] && !valid_symbols[INDENT] && !valid_symbols[DEDENT]) return false;

  bool found_newline = false;
  bool at_eof = false;
  uint16_t indent = 0;
  // Set once we start reading past a comment. From there the token stays where
  // mark_end put it, so the comment is only lookahead and still gets lexed.
  bool locked = false;

  for (;;) {
    if (lexer->eof(lexer)) {
      at_eof = true;
      found_newline = true;
      indent = 0;
      break;
    }

    int32_t c = lexer->lookahead;
    if (c == '\n' || c == '\r') {
      found_newline = true;
      indent = 0;
      lexer->advance(lexer, locked);
    } else if (c == ' ' || c == '\t' || c == '\f') {
      indent++;
      lexer->advance(lexer, locked);
    } else if (c == '#' || c == '/') {
      // A comment-only line must not decide the indent, so read past it.
      // With no newline behind us there is nothing to report yet.
      if (!found_newline) return false;
      if (!locked) {
        lexer->mark_end(lexer);
        locked = true;
      }
      if (!advance_past_comment(lexer)) break;
    } else {
      // A backslash opens a line continuation, which grammar.js lexes.
      if (c == '\\') return false;
      break;
    }
  }

  if (!found_newline) return false;
  // Deriving these twice would spin, since the position can no longer move.
  if (at_eof) {
    if (s->eof_done) return false;
    s->eof_done = 1;
  }

  uint16_t open = current_indent(s);
  if (indent > open) {
    if (valid_symbols[INDENT]) {
      s->indent_pending = 1;
      s->indent_value = indent;
    } else {
      s->newline_pending = 1;
    }
  } else {
    s->newline_pending = 1;
    if (indent < open) {
      uint16_t count = 0;
      uint16_t i = s->depth;
      while (i > 1 && indent < s->indents[i - 1]) {
        count++;
        i--;
      }
      s->dedents_pending = count;
    }
  }

  if (serve_pending(s, lexer, valid_symbols)) return true;
  clear_pending(s);
  return false;
}
