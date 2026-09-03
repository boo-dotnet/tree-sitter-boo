(method body: (_) @function.inside) @function.around
(constructor body: (_) @function.inside) @function.around
(destructor body: (_) @function.inside) @function.around
(nested_function body: (_) @function.inside) @function.around
(accessor body: (_) @function.inside) @function.around
(callable_expression (block) @function.inside) @function.around
(closure) @function.around

(class_definition body: (_) @class.inside) @class.around
(interface_definition body: (_) @class.inside) @class.around
(enum_definition body: (_) @class.inside) @class.around
(callable_definition) @class.around

(parameter_list (parameter) @parameter.inside)
(argument_list (argument) @parameter.inside)
(generic_parameters (generic_parameter) @parameter.inside)

(comment) @comment.inside
(comment)+ @comment.around

(attribute_list) @entry.around
(enum_member) @entry.around
(key_value) @entry.around
