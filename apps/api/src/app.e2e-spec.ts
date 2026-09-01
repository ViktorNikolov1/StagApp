import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Controller,
  Post,
  Body,
  Module,
  Get,
  InternalServerErrorException,
} from '@nestjs/common';
import { IsString, IsInt, Min } from 'class-validator';
import request from 'supertest';
import { AppModule } from './app.module';

class TestDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  age!: number;
}

@Controller('test')
class TestController {
  @Post()
  create(@Body() dto: TestDto): TestDto {
    return dto;
  }

  @Get('error')
  throwError(): never {
    throw new InternalServerErrorException();
  }

  @Get('unhandled')
  throwUnhandled(): never {
    throw new Error('unhandled crash');
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.getHttpAdapter().getInstance().disable('x-powered-by');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('X-Request-ID', () => {
    it('should include X-Request-ID in response', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect((res) => {
          expect(res.headers['x-request-id']).toBeDefined();
        });
    });

    it('should propagate incoming X-Request-ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Request-ID', 'my-custom-id-123')
        .expect((res) => {
          expect(res.headers['x-request-id']).toBe('my-custom-id-123');
        });
    });
  });

  describe('X-Powered-By', () => {
    it('should NOT include X-Powered-By header', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect((res) => {
          expect(res.headers['x-powered-by']).toBeUndefined();
        });
    });
  });

  describe('ValidationPipe', () => {
    it('should reject invalid DTO with 400 and field-level errors', () => {
      return request(app.getHttpServer())
        .post('/api/v1/test')
        .send({ name: 123, age: -1 })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBeInstanceOf(Array);
          expect(res.body.message.length).toBeGreaterThan(0);
        });
    });

    it('should strip unknown properties', () => {
      return request(app.getHttpServer())
        .post('/api/v1/test')
        .send({ name: 'John', age: 25, unknownField: 'hacker', extra: true })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('John');
          expect(res.body.age).toBe(25);
          expect(res.body).not.toHaveProperty('unknownField');
          expect(res.body).not.toHaveProperty('extra');
        });
    });

    it('should pass through valid properties after transformation', () => {
      return request(app.getHttpServer())
        .post('/api/v1/test')
        .send({ name: 'Jane', age: 30 })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Jane');
          expect(res.body.age).toBe(30);
        });
    });
  });

  describe('Exception handling', () => {
    it('should return generic 500 without stack traces for unhandled errors', () => {
      return request(app.getHttpServer())
        .get('/api/v1/test/unhandled')
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toBe('An unexpected error occurred');
          expect(res.body).not.toHaveProperty('stack');
          expect(JSON.stringify(res.body)).not.toContain('unhandled crash');
        });
    });
  });
});
