; Keywords

[
  "abstract"
  "as"
  "assembly:"
  "callable"
  "cast"
  "class"
  "constructor"
  "def"
  "destructor"
  "do"
  "enum"
  "event"
  "final"
  "get"
  "import"
  "interface"
  "internal"
  "isa"
  "module:"
  "namespace"
  "new"
  "of"
  "override"
  "partial"
  "private"
  "protected"
  "public"
  "ref"
  "set"
  "static"
  "struct"
  "transient"
  "typeof"
  "virtual"
] @keyword

[
  "elif"
  "end"
  "else"
  "ensure"
  "except"
  "failure"
  "for"
  "goto"
  "if"
  "in"
  "then"
  "try"
  "unless"
  "while"
] @keyword.control

[
  (break_statement)
  (continue_statement)
  (pass_statement)
] @keyword.control

[
  "raise"
  "return"
  "yield"
] @keyword.control.return

[
  "and"
  "is"
  "not"
  "or"
] @keyword.operator

(modifier) @keyword.storage.modifier

; Operators

[
  "+" "-" "*" "/" "%" "**"
  "=" "+=" "-=" "*=" "/=" "%=" "|=" "&=" "^=" "<<=" ">>="
  "==" "!=" "=~" "!~" "<" ">" "<=" ">="
  "&" "|" "^" "~" "<<" ">>"
  "++" "--" "?"
] @operator

[ "." "," ":" ";" ] @punctuation.delimiter
[ "(" ")" "[" "]" "{" "}" "[|" "|]" ] @punctuation.bracket
"$" @punctuation.special

; Literals

(comment) @comment
(integer) @number
(float) @number
(timespan) @number
(boolean) @constant.builtin.boolean
(null) @constant.builtin
(regex) @string.regexp
(escape_sequence) @constant.character.escape
(string) @string
(docstring) @string.documentation
[ "${" "$(" ] @punctuation.special
(interpolation (identifier) @variable)
(char_literal "char" @function.builtin)

[ (self) (super) ] @variable.builtin

; Definitions

(class_definition name: (identifier) @type)
(interface_definition name: (identifier) @type)
(enum_definition name: (identifier) @type)
(callable_definition name: (identifier) @type)
(enum_member name: (identifier) @constant)

(method name: (identifier) @function)
(nested_function name: (identifier) @function)
(constructor "constructor" @constructor)
(destructor "destructor" @constructor)

(property_definition name: (identifier) @variable.other.member)
(field name: (identifier) @variable.other.member)
(event_declaration name: (identifier) @variable.other.member)

(parameter name: (identifier) @variable.parameter)
(generic_parameter name: (identifier) @type.parameter)
(declaration name: (identifier) @variable)
(variable_declaration name: (identifier) @variable)

(label_statement name: (identifier) @label)
(goto_statement label: (identifier) @label)

; Types

(simple_type name: (qualified_name (identifier) @type))
(simple_type name: [ "callable" "char" ] @type.builtin)
(callable_type "callable" @type.builtin)

((simple_type
   name: (qualified_name . (identifier) @type.builtin))
 (#any-of? @type.builtin
   "bool" "byte" "sbyte" "char" "decimal" "double" "single" "float"
   "int" "uint" "long" "ulong" "short" "ushort" "object" "string"
   "date" "timespan" "regex" "void" "duck"))

; References

(attribute name: (qualified_name (identifier) @attribute))
(macro_statement name: (identifier) @function.macro)
(macro_call name: (identifier) @function.macro)

(call function: (identifier) @function)
(call function: (member_access member: (identifier) @function.method))
(member_access member: (identifier) @variable.other.member)
(named_argument name: (identifier) @variable.parameter)
(key_value key: (identifier) @variable.other.member)

(namespace_directive name: (qualified_name (identifier) @namespace))
(import_directive name: (qualified_name (identifier) @namespace))

(identifier) @variable
