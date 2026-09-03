((comment) @injection.content
 (#set! injection.language "comment"))

; The delimiters ride along in the injected text: regex is a single token, so
; there is no inner node to capture, and Helix has no #offset! predicate.
((regex) @injection.content
 (#set! injection.language "regex"))
