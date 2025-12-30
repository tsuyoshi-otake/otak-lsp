type JsonRpcId = number;

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
}

type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type RequestHandler = (request: JsonRpcRequest) => void;
type NotificationHandler = (method: string, params: unknown) => void;
type ErrorHandler = (error: Error) => void;

export class JsonRpcConnection {
  private readonly reader: NodeJS.ReadableStream;
  private readonly writer: NodeJS.WritableStream;
  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private nextId = 1;
  private buffer = Buffer.alloc(0);
  private closed = false;
  private requestHandler: RequestHandler | null = null;
  private notificationHandler: NotificationHandler | null = null;
  private errorHandler: ErrorHandler | null = null;

  constructor(reader: NodeJS.ReadableStream, writer: NodeJS.WritableStream) {
    this.reader = reader;
    this.writer = writer;

    this.reader.on('data', (chunk) => this.handleData(chunk as Buffer));
    this.reader.on('error', (error) => this.handleError(error));
    this.reader.on('close', () => this.handleClose());
    this.writer.on('error', (error) => this.handleError(error));
  }

  onRequest(handler: RequestHandler): void {
    this.requestHandler = handler;
  }

  onNotification(handler: NotificationHandler): void {
    this.notificationHandler = handler;
  }

  onError(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  sendRequest<T>(method: string, params?: unknown): Promise<T> {
    if (this.closed) {
      return Promise.reject(new Error('接続が終了しています。'));
    }

    const id = this.nextId++;
    const message: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    this.sendMessage(message);

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject
      });
    });
  }

  sendNotification(method: string, params?: unknown): void {
    if (this.closed) {
      return;
    }

    const message: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params
    };
    this.sendMessage(message);
  }

  sendResponse(id: JsonRpcId, result: unknown): void {
    if (this.closed) {
      return;
    }

    const message: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      result
    };
    this.sendMessage(message);
  }

  sendError(id: JsonRpcId, error: JsonRpcError): void {
    if (this.closed) {
      return;
    }

    const message: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      error
    };
    this.sendMessage(message);
  }

  private handleData(chunk: Buffer): void {
    if (this.closed) {
      return;
    }

    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const headerEnd = this.findHeaderEnd(this.buffer);
      if (headerEnd === -1) {
        return;
      }

      const headerText = this.buffer.slice(0, headerEnd.index).toString('ascii');
      const contentLength = this.parseContentLength(headerText);
      if (contentLength === null) {
        this.handleError(new Error('Content-Lengthが見つかりません。'));
        return;
      }

      const bodyStart = headerEnd.index + headerEnd.delimiterLength;
      const totalLength = bodyStart + contentLength;
      if (this.buffer.length < totalLength) {
        return;
      }

      const body = this.buffer.slice(bodyStart, totalLength).toString('utf8');
      this.buffer = this.buffer.slice(totalLength);

      try {
        const message = JSON.parse(body) as JsonRpcMessage;
        this.handleMessage(message);
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error('JSONの解析に失敗しました。'));
      }
    }
  }

  private handleMessage(message: JsonRpcMessage): void {
    if ('method' in message) {
      if ('id' in message) {
        this.requestHandler?.(message);
        return;
      }
      this.notificationHandler?.(message.method, message.params);
      return;
    }

    if ('id' in message) {
      const pending = this.pendingRequests.get(message.id);
      if (!pending) {
        return;
      }
      this.pendingRequests.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private handleError(error: Error): void {
    this.errorHandler?.(error);
  }

  private handleClose(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    for (const pending of this.pendingRequests.values()) {
      pending.reject(new Error('接続が終了しました。'));
    }
    this.pendingRequests.clear();
  }

  private sendMessage(message: JsonRpcMessage): void {
    const payload = JSON.stringify(message);
    const contentLength = Buffer.byteLength(payload, 'utf8');
    const header = `Content-Length: ${contentLength}\r\n\r\n`;
    this.writer.write(header, 'utf8');
    this.writer.write(payload, 'utf8');
  }

  private parseContentLength(header: string): number | null {
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      return null;
    }
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? value : null;
  }

  private findHeaderEnd(buffer: Buffer): { index: number; delimiterLength: number } | -1 {
    const crlfIndex = buffer.indexOf('\r\n\r\n');
    if (crlfIndex !== -1) {
      return { index: crlfIndex, delimiterLength: 4 };
    }
    const lfIndex = buffer.indexOf('\n\n');
    if (lfIndex !== -1) {
      return { index: lfIndex, delimiterLength: 2 };
    }
    return -1;
  }
}
