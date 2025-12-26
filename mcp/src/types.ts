export interface JsonSchemaProperty {
  type: 'string';
  description?: string;
}

export interface JsonSchemaObject {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Diagnostic {
  range: Range;
  severity?: number;
  message: string;
  code?: string | number;
  source?: string;
}

export interface AnalyzeArguments {
  text: string;
  languageId: string;
  uri?: string;
}

export interface AnalyzeResult {
  diagnostics: Diagnostic[];
}
