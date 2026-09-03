(class_definition
  "class" @context
  name: (_) @name) @item

(class_definition
  "struct" @context
  name: (_) @name) @item

(interface_definition
  "interface" @context
  name: (_) @name) @item

(enum_definition
  "enum" @context
  name: (_) @name) @item

(callable_definition
  "callable" @context
  name: (_) @name) @item

(method
  "def" @context
  name: (_) @name) @item

(constructor "constructor" @context @name) @item
(destructor "destructor" @context @name) @item

(property_definition name: (_) @name) @item
(field name: (_) @name) @item
(event_declaration "event" @context name: (_) @name) @item
(enum_member name: (_) @name) @item
(macro_statement name: (_) @name) @item
