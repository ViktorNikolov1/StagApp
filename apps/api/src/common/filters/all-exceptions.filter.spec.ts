import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

function createMockHost(requestId?: string) {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockRequest = {
    headers: { 'x-request-id': requestId ?? 'test-request-id' },
  };
  const mockResponse = { status: mockStatus };

  const host = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
  } as unknown as ArgumentsHost;

  return { host, mockStatus, mockJson };
}

function createMockLogger(): PinoLogger {
  return {
    setContext: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockLogger: PinoLogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    filter = new AllExceptionsFilter(mockLogger);
  });

  it('should handle HttpException with correct status', () => {
    const { host, mockStatus, mockJson } = createMockHost();
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'test-request-id' }),
    );
  });

  it('should handle HttpException with 400 and preserve validation details', () => {
    const { host, mockStatus, mockJson } = createMockHost();
    const exception = new HttpException(
      {
        statusCode: 400,
        message: ['field must be a string'],
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['field must be a string'],
        error: 'Bad Request',
        requestId: 'test-request-id',
      }),
    );
  });

  it('should return generic 500 for unknown errors', () => {
    const { host, mockStatus, mockJson } = createMockHost();
    const exception = new Error('something broke internally');

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      requestId: 'test-request-id',
    });
  });

  it('should NOT include stack traces in 500 responses', () => {
    const { host, mockJson } = createMockHost();
    const exception = new Error('secret internal error');

    filter.catch(exception, host);

    const responseBody = mockJson.mock.calls[0][0];
    expect(responseBody).not.toHaveProperty('stack');
    expect(JSON.stringify(responseBody)).not.toContain('secret internal error');
  });

  it('should include requestId in error responses', () => {
    const { host, mockJson } = createMockHost('custom-id-123');
    const exception = new Error('fail');

    filter.catch(exception, host);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'custom-id-123' }),
    );
  });

  it('should log unhandled errors via PinoLogger', () => {
    const { host } = createMockHost();
    const exception = new Error('unexpected');

    filter.catch(exception, host);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('unexpected'),
      'Unhandled exception',
    );
  });
});
