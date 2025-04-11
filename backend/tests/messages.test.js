const request = require('supertest');
const app = require('../src/index');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

// Mock the Claude service
jest.mock('../src/services/claude', () => ({
  handleUserMessage: jest.fn().mockResolvedValue('Mock AI response to your message'),
  handleJointSession: jest.fn().mockResolvedValue('Mock AI response for joint session')
}));

describe('Message API Endpoints', () => {
  let testUser;
  let testToken;
  let testSession;

  // Set up test data before running tests
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.message.deleteMany({ where: { sender: { pseudonym: 'testuser' } } });
    await prisma.sessionParticipant.deleteMany({ where: { user: { pseudonym: 'testuser' } } });
    await prisma.session.deleteMany({ where: { createdBy: { pseudonym: 'testuser' } } });
    await prisma.user.deleteMany({ where: { pseudonym: 'testuser' } });

    // Create a test user
    testUser = await prisma.user.create({
      data: {
        pseudonym: 'testuser',
        authId: 'test-auth-id',
        publicKey: { key: 'test-public-key' }
      }
    });

    // Create a JWT token for the test user
    testToken = jwt.sign(
      { user: { id: testUser.id } },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' }
    );

    // Create a test session
    testSession = await prisma.session.create({
      data: {
        type: 'individual',
        createdById: testUser.id,
        participants: {
          create: {
            userId: testUser.id
          }
        }
      }
    });
  });

  // Clean up test data after running tests
  afterAll(async () => {
    await prisma.message.deleteMany({ where: { sender: { pseudonym: 'testuser' } } });
    await prisma.sessionParticipant.deleteMany({ where: { user: { pseudonym: 'testuser' } } });
    await prisma.session.deleteMany({ where: { createdBy: { pseudonym: 'testuser' } } });
    await prisma.user.deleteMany({ where: { pseudonym: 'testuser' } });
    await prisma.$disconnect();
  });

  describe('POST /api/messages', () => {
    it('should create a new message and return AI response', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('x-auth-token', testToken)
        .send({
          sessionId: testSession.id,
          content: 'Hello, this is a test message',
          encryptedContent: 'encrypted-test-message',
          encryptionMetadata: { iv: 'test-iv', encryptedKey: 'test-encrypted-key' }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userMessage');
      expect(response.body).toHaveProperty('aiMessage');
      expect(response.body.userMessage.encryptedContent).toBe('encrypted-test-message');
      expect(response.body.aiMessage.content).toBe('Mock AI response to your message');
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('x-auth-token', testToken)
        .send({
          sessionId: '00000000-0000-0000-0000-000000000000', // Non-existent session ID
          content: 'Hello, this is a test message',
          encryptedContent: 'encrypted-test-message',
          encryptionMetadata: { iv: 'test-iv', encryptedKey: 'test-encrypted-key' }
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Session not found');
    });

    it('should return 403 if user is not a session participant', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          pseudonym: 'anotheruser',
          authId: 'another-auth-id',
          publicKey: { key: 'another-public-key' }
        }
      });

      // Create a session for the other user
      const anotherSession = await prisma.session.create({
        data: {
          type: 'individual',
          createdById: anotherUser.id,
          participants: {
            create: {
              userId: anotherUser.id
            }
          }
        }
      });

      const response = await request(app)
        .post('/api/messages')
        .set('x-auth-token', testToken) // Using original test user's token
        .send({
          sessionId: anotherSession.id, // Session the test user is not part of
          content: 'Hello, this is a test message',
          encryptedContent: 'encrypted-test-message',
          encryptionMetadata: { iv: 'test-iv', encryptedKey: 'test-encrypted-key' }
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'User is not a participant in this session');

      // Clean up the other user and session
      await prisma.sessionParticipant.deleteMany({ where: { userId: anotherUser.id } });
      await prisma.session.delete({ where: { id: anotherSession.id } });
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });
  });

  describe('GET /api/messages/:sessionId', () => {
    it('should get messages for a session', async () => {
      // First, add a message to the session
      await prisma.message.create({
        data: {
          sessionId: testSession.id,
          senderId: testUser.id,
          isAi: false,
          encryptedContent: 'test-encrypted-message',
          encryptionMetadata: { test: 'metadata' }
        }
      });
      
      const response = await request(app)
        .get(`/api/messages/${testSession.id}`)
        .set('x-auth-token', testToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('encryptedContent', 'test-encrypted-message');
      expect(response.body[0]).toHaveProperty('encryptionMetadata');
    });

    it('should return 403 if user is not a session participant', async () => {
      // Create another user and session
      const anotherUser = await prisma.user.create({
        data: {
          pseudonym: 'anotheruser2',
          authId: 'another-auth-id-2',
          publicKey: { key: 'another-public-key-2' }
        }
      });

      const anotherSession = await prisma.session.create({
        data: {
          type: 'individual',
          createdById: anotherUser.id,
          participants: {
            create: {
              userId: anotherUser.id
            }
          }
        }
      });

      const response = await request(app)
        .get(`/api/messages/${anotherSession.id}`)
        .set('x-auth-token', testToken); // Using original test user's token

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'User is not a participant in this session');

      // Clean up
      await prisma.sessionParticipant.deleteMany({ where: { userId: anotherUser.id } });
      await prisma.session.delete({ where: { id: anotherSession.id } });
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });
  });
});