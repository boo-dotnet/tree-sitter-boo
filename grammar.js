// Boo grammar, tracking src/Boo.Lang.Parser/BooLexer.g4 and BooParser.g4.
// Blocks close on a dedent or on 'end'.

const PREC = {
  or: 1,
  and: 2,
  not: 3,
  assign: 4,
  compare: 5,
  sum: 6,
  term: 7,
  shift: 8,
  power: 9,
  cast: 10,
  unary: 11,
  call: 12,
};

const MODIFIERS = [
  'abstract',
  'final',
  'internal',
  'new',
  'override',
  'partial',
  'private',
  'protected',
  'public',
  'static',
  'transient',
  'virtual',
];

module.exports = grammar({
  name: 'boo',

  externals: $ => [
    $._newline,
    $._indent,
    $._dedent,
  ],

  extras: $ => [
    /[ \t\f]+/,
    /\r?\n/,
    /\r/,
    $.comment,
    $.line_continuation,
  ],

  word: $ => $.identifier,

  inline: $ => [
    $._member_name,
    $._macro_name,
  ],

  conflicts: $ => [
    [$.explicit_member, $.macro_statement, $.macro_call, $._expression],
    [$.explicit_member, $.property_definition, $.macro_statement, $.macro_call, $._expression],
    [$.explicit_member],
    [$._initializer, $.block_statement],
    [$.property_definition, $.field, $.block_statement, $.variable_declaration, $.declaration, $._expression],
    [$.block_statement, $.variable_declaration, $.declaration, $._expression],
    [$.property_definition, $.macro_statement, $.macro_call, $._expression],
    [$._expression, $.char_literal],
    [$.splice_member, $.field, $._expression],
    [$._expression_list],
    [$._expression_list, $.generator_expression],
    [$.quasi_quote],
    [$.macro_call, $.declaration],
    [$.parameter, $.macro_call, $.declaration],
    [$.macro_call, $._expression],
    [$.macro_statement, $.macro_call, $.declaration],
    [$.macro_statement, $.macro_call, $._expression],
    [$.statement_modifier, $.generator_expression],
    [$.subscript],
    [$.member_access],
    [$.splice_member, $.field],
    [$.generator_expression],
    [$.call],
    [$.callable_type],
    [$.array_type],
    [$._initializer, $.variable_declaration],
    [$.for_statement],
    [$.event_declaration],
    [$.attribute_list],
    [$.list_initializer, $.hash],
    [$.parameter, $._type],
    [$.parameter, $.qualified_name],
    [$.string, $.docstring],
    [$.docstring],
    [$.method, $.nested_function],
    [$.generic_parameter, $.qualified_name],
    [$.explicit_member, $.omitted_member],
    [$.parameter, $._type, $._expression],
    [$.parameter, $._expression, $.qualified_name],
    [$.property_definition, $.list],
    [$.field, $.variable_declaration],
    [$.declaration, $._expression],
    [$.variable_declaration, $.declaration, $._expression],
    [$.while_statement],
    [$.field],
    [$.unary_expression, $.splice],
    [$.parameter, $._expression],
    [$.parameter, $.declaration],
    [$.parameter, $.declaration, $._expression],
    [$.closure, $.hash],
    [$._expression, $.qualified_name],
    [$._expression_list, $.parenthesized_expression],
    [$.property_definition, $._expression],
    [$.property_definition, $.field, $._expression],
    [$.field, $._expression],
    [$.attribute_list, $.list],
    [$.field, $.property_definition],
    [$.variable_declaration, $.macro_statement],
    [$.simple_type, $._expression],
    [$.simple_type, $.attribute],
    [$._type, $._expression],
    [$.tuple, $.parenthesized_expression],
    [$.property_definition, $.self],
    [$.macro_statement, $._expression],
    [$.property_definition, $.macro_statement, $._expression],
  ],

  rules: {
    source_file: $ => seq(
      optional($._eos),
      repeat($._module_item),
    ),

    _module_item: $ => choice(
      $.namespace_directive,
      $.import_directive,
      $.assembly_attribute,
      $.module_attribute,
      $._module_declaration,
      $._statement,
    ),

    _module_declaration: $ => choice(
      $.class_definition,
      $.interface_definition,
      $.enum_definition,
      $.callable_definition,
      $.method,
    ),

    // -- directives ------------------------------------------------------

    namespace_directive: $ => seq(
      'namespace',
      field('name', $.qualified_name),
      $._eos,
    ),

    import_directive: $ => seq($._import_spec, $._eos),

    _import_spec: $ => seq(
      choice(
        seq(
          'import',
          field('name', $.qualified_name),
          optional(seq('(', optional($._expression_list), ')')),
          optional(seq('from', field('source', choice($.qualified_name, $.string)))),
          optional(seq('as', field('alias', $.identifier))),
        ),
        seq(
          'from',
          field('source', $.qualified_name),
          'import',
          choice('*', $._expression_list),
        ),
      ),
    ),

    assembly_attribute: $ => seq('[', 'assembly:', $.attribute, ']', optional($._eos)),
    module_attribute: $ => seq('[', 'module:', $.attribute, ']', optional($._eos)),

    // -- declarations ----------------------------------------------------

    _type_member: $ => choice(
      $.class_definition,
      $.interface_definition,
      $.enum_definition,
      $.callable_definition,
      $.method,
      $.constructor,
      $.destructor,
      $.event_declaration,
      $.property_definition,
      $.field,
    ),

    attribute_list: $ => seq(
      '[',
      optional(seq($.attribute, repeat(seq(',', $.attribute)))),
      ']',
      optional($._eos),
    ),

    attribute: $ => seq(
      field('name', $.qualified_name),
      optional($.argument_list),
    ),

    _attributes: $ => repeat1($.attribute_list),

    modifier: $ => choice(...MODIFIERS),

    class_definition: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      field('kind', choice('class', 'struct')),
      field('name', choice($.identifier, $.splice)),
      optional($.generic_parameters),
      optional($.base_types),
      field('body', $.type_body),
    ),

    interface_definition: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      'interface',
      field('name', choice($.identifier, $.splice)),
      optional($.generic_parameters),
      optional($.base_types),
      field('body', $.type_body),
    ),

    enum_definition: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      'enum',
      field('name', $.identifier),
      field('body', $.enum_body),
    ),

    callable_definition: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      'callable',
      field('name', $.identifier),
      optional($.generic_parameters),
      $.parameter_list,
      optional($.return_type),
      $._eos,
    ),

    base_types: $ => seq(
      '(',
      optional(seq($._type, repeat(seq(',', $._type)))),
      ')',
    ),

    generic_parameters: $ => seq(
      '[',
      optional('of'),
      $.generic_parameter,
      repeat(seq(',', $.generic_parameter)),
      ']',
    ),

    generic_parameter: $ => seq(
      field('name', $.identifier),
      optional(seq('(', $._generic_constraints, ')')),
    ),

    _generic_constraints: $ => seq(
      choice('class', 'struct', 'constructor', $._type),
      repeat(seq(',', choice('class', 'struct', 'constructor', $._type))),
    ),

    type_body: $ => choice(
      seq(':', $._eos, $._end),
      seq(
        ':',
        optional(seq($._eos, optional($.docstring))),
        $._indent,
        optional($.docstring),
        optional($._eos),
        repeat(choice($._type_member, $._body_pass, $.splice_member, $.macro_statement, $._macro_member)),
        $._dedent,
        optional($._end),
      ),
    ),

    splice_member: $ => seq($.splice, $._eos),

    _body_pass: $ => seq($.pass_statement, $._eos),

    _macro_member: $ => seq($.macro_call, optional($.statement_modifier), $._eos),

    enum_body: $ => choice(
      seq(':', $._eos, $._end),
      seq(
        ':',
        optional(seq($._eos, optional($.docstring))),
        $._indent,
        optional($.docstring),
        optional($._eos),
        repeat(choice($.enum_member, $._body_pass, $.splice_member)),
        $._dedent,
        optional($._end),
      ),
    ),

    enum_member: $ => seq(
      optional($._attributes),
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression))),
      $._eos,
      optional($.docstring),
    ),

    method: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      'def',
      optional($.explicit_member),
      field('name', choice($._member_name, $.splice)),
      optional($.generic_parameters),
      $.parameter_list,
      optional($._attributes),
      optional($.return_type),
      choice(
        field('body', $.block),
        $._eos,
      ),
    ),

    constructor: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      'def',
      'constructor',
      optional($.generic_parameters),
      $.parameter_list,
      optional($._attributes),
      choice(field('body', $.block), $._eos),
    ),

    destructor: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      'def',
      'destructor',
      $.parameter_list,
      optional($._attributes),
      choice(field('body', $.block), $._eos),
    ),

    explicit_member: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier)),
      optional(seq('[', optional('of'), $._type_list, ']')),
      '.',
    ),

    return_type: $ => seq('as', field('type', $._type)),

    parameter_list: $ => seq(
      '(',
      optional(seq($.parameter, repeat(seq(',', $.parameter)))),
      ')',
    ),

    parameter: $ => seq(
      optional($._attributes),
      optional(choice('*', 'ref')),
      field('name', choice($.identifier, $.splice)),
      optional(seq('as', field('type', $._type))),
    ),

    event_declaration: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      'event',
      field('name', $.identifier),
      'as',
      field('type', $._type),
      $._eos,
      optional($.docstring),
    ),

    property_definition: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      optional($.explicit_member),
      field('name', choice($.identifier, $.splice, 'self')),
      optional(choice(
        seq('[', optional(seq($.parameter, repeat(seq(',', $.parameter)))), ']'),
        seq('(', optional(seq($.parameter, repeat(seq(',', $.parameter)))), ')'),
      )),
      optional(seq('as', field('type', $._type))),
      field('body', $.accessor_body),
    ),

    accessor_body: $ => choice(
      seq(
        ':',
        optional(seq($._eos, optional($.docstring))),
        $._indent,
        optional($.docstring),
        optional($._eos),
        repeat1($.accessor),
        $._dedent,
        optional($._end),
      ),
    ),

    accessor: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      field('kind', choice('get', 'set')),
      choice($._eos, field('body', $.block)),
    ),

    field: $ => seq(
      optional($._attributes),
      repeat($.modifier),
      field('name', choice($.identifier, $.splice)),
      optional(seq('as', field('type', $._type))),
      choice(
        seq('=', field('value', $._initializer)),
        $._eos,
      ),
      optional($.docstring),
    ),

    _initializer: $ => choice(
      seq($._expression_list, $._eos),
      seq($._expression, $.callable_expression),
      $.callable_expression,
    ),

    // -- statements ------------------------------------------------------

    // 'end' sits at the indent of the header that opened the block.
    _end: $ => prec.dynamic(10, seq('end', optional($._eos))),

    block: $ => choice(
      seq(
        ':',
        optional(seq($._eos, optional($.docstring))),
        $._indent,
        optional($.docstring),
        optional($._eos),
        repeat1($._statement),
        $._dedent,
        optional($._end),
      ),
      seq(':', $._eos, $._end),
      seq(
        ':',
        $._simple_statement,
        repeat(seq(';', optional($._simple_statement))),
        $._newline,
      ),
    ),

    _statement: $ => choice(
      $.if_statement,
      $.unless_statement,
      $.for_statement,
      $.while_statement,
      $.try_statement,
      $.nested_function,
      $.macro_statement,
      $.block_statement,
      $._terminated_statement,
    ),

    block_statement: $ => choice(
      seq($._expression, field('body', $.callable_expression)),
      seq(
        field('left', $._expression),
        field('operator', choice('=', '+=', '-=', '*=', '/=', '%=', '|=', '&=', '^=', '<<=', '>>=')),
        field('body', $.callable_expression),
      ),
      seq('return', field('body', $.callable_expression)),
      seq(
        field('name', $.identifier),
        'as',
        field('type', $._type),
        '=',
        field('body', $.callable_expression),
      ),
    ),

    _terminated_statement: $ => seq(
      $._simple_statement,
      optional($.statement_modifier),
      $._eos,
    ),

    _simple_statement: $ => choice(
      $.return_statement,
      $.yield_statement,
      $.raise_statement,
      $.break_statement,
      $.continue_statement,
      $.pass_statement,
      $.goto_statement,
      $.label_statement,
      $.variable_declaration,
      $.unpack_statement,
      $.macro_call,
      $.expression_statement,
    ),

    statement_modifier: $ => seq(
      choice('if', 'unless', 'while'),
      field('condition', $._expression),
    ),

    if_statement: $ => seq(
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      repeat($.elif_clause),
      optional($.else_clause),
    ),

    elif_clause: $ => seq(
      'elif',
      field('condition', $._expression),
      field('consequence', $.block),
    ),

    else_clause: $ => seq('else', field('body', $.block)),

    unless_statement: $ => seq(
      'unless',
      field('condition', $._expression),
      field('body', $.block),
    ),

    for_statement: $ => seq(
      'for',
      field('left', $._declaration_list),
      'in',
      field('right', $._expression_list),
      field('body', $.block),
      optional($.or_clause),
      optional($.then_clause),
    ),

    while_statement: $ => seq(
      'while',
      field('condition', $._expression),
      field('body', $.block),
      optional($.or_clause),
      optional($.then_clause),
    ),

    or_clause: $ => seq('or', field('body', $.block)),
    then_clause: $ => seq('then', field('body', $.block)),

    try_statement: $ => seq(
      'try',
      field('body', $.block),
      repeat($.except_clause),
      optional($.failure_clause),
      optional($.ensure_clause),
    ),

    except_clause: $ => seq(
      'except',
      optional(field('name', $.identifier)),
      optional(seq('as', field('type', $._type))),
      optional(seq(choice('if', 'unless'), field('condition', $._expression))),
      field('body', $.block),
    ),

    failure_clause: $ => seq('failure', field('body', $.block)),
    ensure_clause: $ => seq('ensure', field('body', $.block)),

    nested_function: $ => seq(
      'def',
      field('name', $.identifier),
      optional(seq($.parameter_list, optional($.return_type))),
      field('body', $.block),
    ),

    // IsValidMacroArgument in BooParser.g4.cs rules out a macro name
    // followed by '(', '[', '.' or '*'.
    macro_statement: $ => prec.dynamic(-10, seq(
      field('name', $._macro_name),
      optional($._expression_list),
      field('body', $.block),
    )),

    macro_call: $ => prec.dynamic(-10, seq(
      field('name', $._macro_name),
      $._expression_list,
    )),

    return_statement: $ => prec.right(seq(
      'return',
      optional($._expression_list),
    )),

    yield_statement: $ => prec.right(seq('yield', optional($._expression_list))),
    raise_statement: $ => prec.right(seq('raise', optional($._expression))),
    break_statement: $ => 'break',
    continue_statement: $ => 'continue',
    pass_statement: $ => 'pass',
    goto_statement: $ => seq('goto', field('label', $.identifier)),
    label_statement: $ => seq(':', field('name', $.identifier)),

    variable_declaration: $ => seq(
      field('name', $.identifier),
      'as',
      field('type', $._type),
      optional(seq('=', field('value', $._expression_list))),
    ),

    unpack_statement: $ => seq(
      $.declaration,
      ',',
      optional($._declaration_list),
      '=',
      field('right', $._expression_list),
    ),

    _declaration_list: $ => seq($.declaration, repeat(seq(',', $.declaration))),

    declaration: $ => seq(
      field('name', $.identifier),
      optional(seq('as', field('type', $._type))),
    ),

    assignment: $ => prec.right(PREC.assign, seq(
      field('left', $._expression),
      field('operator', choice('=', '+=', '-=', '*=', '/=', '%=', '|=', '&=', '^=', '<<=', '>>=')),
      field('right', $._expression_list),
    )),

    expression_statement: $ => $._expression,

    // -- types -----------------------------------------------------------

    _type: $ => choice(
      $.simple_type,
      $.array_type,
      $.callable_type,
      $.splice,
    ),

    simple_type: $ => prec.right(seq(
      field('name', choice($.qualified_name, 'callable', 'char')),
      optional(choice(
        $.generic_arguments,
        seq('of', choice('*', $._type)),
      )),
      optional('?'),
      repeat(choice('*', '**')),
    )),

    generic_arguments: $ => seq(
      '[',
      optional('of'),
      choice(
        seq('*', repeat(seq(',', '*'))),
        $._type_list,
      ),
      ']',
    ),

    array_type: $ => seq(
      '(',
      $._type,
      optional(seq(',', $.integer)),
      ')',
      repeat(choice('*', '**')),
    ),

    callable_type: $ => seq(
      'callable',
      '(',
      optional(seq($.callable_parameter, repeat(seq(',', $.callable_parameter)))),
      ')',
      optional(seq('as', $._type)),
    ),

    callable_parameter: $ => seq(optional(choice('*', 'ref')), $._type),

    _type_list: $ => seq($._type, repeat(seq(',', $._type))),

    // -- expressions -----------------------------------------------------

    _expression: $ => choice(
      $.assignment,
      $.binary_expression,
      $.unary_expression,
      $.not_expression,
      $.type_test,
      $.type_conversion,
      $.generator_expression,
      $.conditional_expression,
      $.call,
      $.member_access,
      $.subscript,
      $.generic_reference,
      $.parenthesized_expression,
      $.tuple,
      $.typed_array,
      $.cast_expression,
      $.typeof_expression,
      $.char_literal,
      $.closure,
      $.quasi_quote,
      $.splice,
      $.omitted_member,
      $.identifier,
      alias('char', $.identifier),
      $.self,
      $.super,
      $.null,
      $.boolean,
      $.integer,
      $.float,
      $.timespan,
      $.string,
      $.regex,
      $.list,
      $.hash,
    ),

    _expression_list: $ => choice(
      ',',
      seq($._expression, repeat(seq(',', $._expression)), optional(',')),
    ),

    binary_expression: $ => {
      const table = [
        ['or', PREC.or],
        ['and', PREC.and],
        ['|', PREC.sum],
        ['^', PREC.sum],
        ['+', PREC.sum],
        ['-', PREC.sum],
        ['*', PREC.term],
        ['/', PREC.term],
        ['%', PREC.term],
        ['&', PREC.term],
        ['<<', PREC.shift],
        ['>>', PREC.shift],
      ];

      return choice(
        ...table.map(([operator, precedence]) => prec.left(precedence, seq(
          field('left', $._expression),
          field('operator', operator),
          field('right', $._expression),
        ))),
        prec.right(PREC.power, seq(
          field('left', $._expression),
          field('operator', '**'),
          field('right', $._expression),
        )),
        prec.left(PREC.compare, seq(
          field('left', $._expression),
          field('operator', choice('<', '>', '<=', '>=', '==', '!=', '=~', '!~', 'is', seq('is', 'not'), 'in', seq('not', 'in'))),
          field('right', $._expression),
        )),
      );
    },

    unary_expression: $ => prec.right(PREC.unary, choice(
      seq(field('operator', choice('-', '~', '++', '--', '*')), $._expression),
      seq($._expression, field('operator', choice('++', '--'))),
    )),

    not_expression: $ => prec.right(PREC.not, seq('not', $._expression)),

    type_test: $ => prec.left(PREC.compare, seq($._expression, 'isa', field('type', $._type))),

    type_conversion: $ => prec.left(PREC.cast, seq(
      $._expression,
      field('operator', choice('as', 'cast')),
      field('type', $._type),
    )),

    generator_expression: $ => prec.right(seq(
      $._expression,
      repeat1(seq(
        'for',
        field('left', $._declaration_list),
        'in',
        field('right', $._expression),
        optional($.statement_modifier),
      )),
    )),

    conditional_expression: $ => seq(
      '(',
      field('consequence', $._expression),
      'if',
      field('condition', $._expression),
      'else',
      field('alternative', $._expression),
      ')',
    ),

    call: $ => prec(PREC.call, seq(
      field('function', $._expression),
      $.argument_list,
      optional('?'),
      optional(choice($.hash, $.list_initializer)),
    )),

    argument_list: $ => seq(
      '(',
      optional(seq($.argument, repeat(seq(',', $.argument)))),
      ')',
    ),

    argument: $ => choice($.named_argument, $._expression),

    named_argument: $ => seq(field('name', $._expression), ':', field('value', $._expression)),

    list_initializer: $ => seq('{', optional($._expression_list), '}'),

    member_access: $ => prec(PREC.call, seq(
      field('object', $._expression),
      optional('?'),
      '.',
      field('member', choice($._member_name, $.splice)),
      optional('?'),
    )),

    omitted_member: $ => seq('.', field('member', $._member_name)),

    generic_reference: $ => prec(PREC.call, seq($._expression, 'of', $._type)),

    subscript: $ => prec(PREC.call, seq(
      field('object', $._expression),
      optional('?'),
      '[',
      choice(
        seq('of', $._type_list),
        seq($.slice, repeat(seq(',', $.slice))),
      ),
      ']',
      optional('?'),
    )),

    slice: $ => choice(
      seq(':', optional(choice($._expression, seq(':', $._expression)))),
      seq($._expression, optional(seq(':', optional($._expression), optional(seq(':', $._expression))))),
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple: $ => seq('(', $._expression_list, ')'),

    typed_array: $ => seq('(', 'of', $._type, ':', optional($._expression_list), ')'),

    cast_expression: $ => seq('cast', '(', field('type', $._type), ',', $._expression, ')'),

    typeof_expression: $ => seq('typeof', '(', field('type', $._type), ')'),

    char_literal: $ => seq('char', '(', optional(choice($.string, $.integer)), ')'),

    closure: $ => seq(
      '{',
      optional(seq(optional(seq($.parameter, repeat(seq(',', $.parameter)))), '|')),
      optional($._closure_statement),
      repeat(seq(';', optional($._closure_statement))),
      '}',
    ),

    _closure_statement: $ => seq(
      choice($.return_statement, $.yield_statement, $.raise_statement, $.unpack_statement, $.macro_call, $.expression_statement),
      optional($.statement_modifier),
    ),

    callable_expression: $ => choice(
      $.block,
      seq(
        choice('do', 'def'),
        optional(seq($.parameter_list, optional($.return_type))),
        $.block,
      ),
    ),

    quasi_quote: $ => seq(
      '[|',
      choice(
        seq(
          $._indent,
          repeat1(choice($._statement, $._type_member, $.splice_member)),
          $._dedent,
        ),
        seq($._expression, ':', $._expression),
        alias($._import_spec, $.import_directive),
        seq(
          optional($._closure_statement),
          repeat(seq($._eos, optional($._closure_statement))),
        ),
      ),
      '|]',
    ),

    splice: $ => prec(PREC.unary, seq('$', $._expression)),

    list: $ => seq('[', optional($._expression_list), ']'),

    hash: $ => seq(
      '{',
      optional(seq($.key_value, repeat(seq(',', $.key_value)), optional(','))),
      '}',
    ),

    key_value: $ => seq(field('key', $._expression), ':', field('value', $._expression)),

    // -- names -----------------------------------------------------------

    qualified_name: $ => prec.right(seq($.identifier, repeat(seq('.', $.identifier)))),

    _member_name: $ => choice(
      $.identifier,
      alias('set', $.identifier),
      alias('get', $.identifier),
      alias('internal', $.identifier),
      alias('public', $.identifier),
      alias('protected', $.identifier),
      alias('event', $.identifier),
      alias('ref', $.identifier),
      alias('yield', $.identifier),
    ),

    _macro_name: $ => choice($.identifier, alias('then', $.identifier)),

    identifier: $ => /@?[_a-zA-Z\u0080-\uFFFE][_a-zA-Z0-9\u0080-\uFFFE]*|@/,

    self: $ => 'self',
    super: $ => 'super',
    null: $ => 'null',
    boolean: $ => choice('true', 'false'),

    // -- literals --------------------------------------------------------

    integer: $ => token(choice(
      seq(/0[xX][0-9a-fA-F]+/, optional(/[lL]/)),
      seq(/[0-9](_?[0-9])*/, optional(/[eE][+-]?[0-9]+/), optional(/[lL]/)),
    )),

    float: $ => token(choice(
      seq(/[0-9](_?[0-9])*/, optional(/[eE][+-]?[0-9]+/), '.', /[0-9](_?[0-9])*/, optional(/[eE][+-]?[0-9]+/), optional(/[fF]/)),
      seq('.', /[0-9](_?[0-9])*/, optional(/[eE][+-]?[0-9]+/), optional(/[fF]/)),
      seq(/[0-9](_?[0-9])*/, /[fF]/),
    )),

    timespan: $ => token(seq(
      /[0-9](_?[0-9])*/,
      optional(seq('.', /[0-9](_?[0-9])*/)),
      optional(/[eE][+-]?[0-9]+/),
      choice('ms', 's', 'm', 'h', 'd'),
    )),

    string: $ => choice(
      $.single_quoted_string,
      $.double_quoted_string,
      $.triple_quoted_string,
      $.backtick_string,
    ),

    docstring: $ => seq($.triple_quoted_string, optional($._eos)),

    single_quoted_string: $ => seq(
      "'",
      repeat(choice(
        alias(token.immediate(prec(1, /[^'\\\r\n]+/)), $.string_content),
        $.escape_sequence,
      )),
      "'",
    ),

    double_quoted_string: $ => seq(
      '"',
      repeat(choice(
        alias(token.immediate(prec(1, /[^"\\\r\n$]+/)), $.string_content),
        $.escape_sequence,
        $.interpolation,
        alias(token.immediate('$'), $.string_content),
      )),
      '"',
    ),

    triple_quoted_string: $ => choice(
      seq(
        '"""',
        repeat(choice(
          alias(token.immediate(prec(1, /(\\.|[^"\\$]|"[^"]|""[^"])+/)), $.string_content),
          $.interpolation,
          alias(token.immediate('$'), $.string_content),
        )),
        '"""',
      ),
      seq(
        "'''",
        repeat(choice(
          alias(token.immediate(prec(1, /(\\.|[^'\\$]|'[^']|''[^'])+/)), $.string_content),
          $.interpolation,
          alias(token.immediate('$'), $.string_content),
        )),
        "'''",
      ),
    ),

    backtick_string: $ => token(seq('`', /[^`]*/, '`')),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /[rntabf0\\'"$\/]/,
        /u[0-9a-fA-F]{4}/,
      ),
    )),

    interpolation: $ => choice(
      seq(
        token.immediate('${'),
        $._expression,
        optional(seq(':', field('format', $.identifier))),
        '}',
      ),
      seq(
        token.immediate('$('),
        $._expression,
        optional(seq(':', field('format', $.identifier))),
        ')',
      ),
      seq(token.immediate('$'), alias(token.immediate(/@?[_a-zA-Z][_a-zA-Z0-9]*/), $.identifier)),
    ),

    regex: $ => token(choice(
      seq('@/', repeat1(choice(/\\./, /[^\/\\\r\n]/)), '/'),
      seq('/', repeat1(choice(/\\./, /[^ \/\\\r\n\t]/)), '/', optional(/[a-zA-Z]+/)),
    )),

    // -- trivia ----------------------------------------------------------

    comment: $ => token(choice(
      seq(choice('#', '//'), /[^\r\n]*/),
      seq('/*', /([^*]|\*[^\/])*/, '*/'),
    )),

    line_continuation: $ => token(seq('\\', /\r?\n|[ \t]/)),

    _eos: $ => repeat1(choice($._newline, ';')),
  },
});
