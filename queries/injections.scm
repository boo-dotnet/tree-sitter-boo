((comment) @injection.content
 (#set! injection.language "comment"))

((regex) @injection.content
 (#set! injection.language "regex")
 (#offset! @injection.content 1 0 -1 0))
