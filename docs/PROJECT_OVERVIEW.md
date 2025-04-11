# Coco Counseling Project Overview

## Project Structure

We've set up a complete structure for the Coco Counseling platform with the following components:

### Backend (Node.js + Express)
- **API Routes**: Authentication, users, sessions, messages, and connections
- **Database**: PostgreSQL with Prisma ORM
- **Security**: JWT authentication and end-to-end encryption
- **Claude Integration**: API service to handle conversations with different prompt designs

### Frontend (React + TypeScript)
- **State Management**: Redux Toolkit with slices for auth, sessions, messages, and connections
- **Components**: Organized by feature (auth, chat, sessions, connections)
- **Encryption**: Client-side encryption utilities for secure message handling
- **UI**: Styled with Tailwind CSS

### Documentation
- Getting Started guide
- Claude prompt design documentation
- Database schema documentation
- Project overview (this document)

## Key Features Implemented

1. **User Authentication**
   - Registration with pseudonyms for privacy
   - Secure login with JWT
   - Key generation for end-to-end encryption

2. **Conversation Management**
   - Individual sessions with Claude
   - Joint sessions with multiple participants
   - Session history and context preservation

3. **Connections System**
   - Invite users to connect
   - Accept/decline connection requests
   - Manage different relationship types

4. **Secure Messaging**
   - End-to-end encrypted messages
   - Message history with decryption
   - Real-time AI responses from Claude

5. **Claude Integration**
   - Custom system prompts for relationship counseling
   - Different prompting strategies for individual vs joint sessions
   - Contextual awareness in conversations

## Database Schema

The database schema includes the following tables:

- **Users**: Store user accounts with pseudonyms and encryption keys
- **Connections**: Track relationships between users
- **Sessions**: Represent individual or joint counseling sessions
- **SessionParticipants**: Map users to their sessions
- **Messages**: Store encrypted messages with metadata

## API Endpoints

The API includes endpoints for:

- **/api/auth**: Register, login, refresh tokens
- **/api/users**: User profile management and search
- **/api/connections**: Connection invitations and management
- **/api/sessions**: Create and manage counseling sessions
- **/api/messages**: Send and retrieve encrypted messages

## Security Considerations

This implementation includes several key security features:

1. **End-to-End Encryption**
   - Client-side message encryption
   - RSA for key exchange and AES for message content
   - Encryption metadata stored separately from content

2. **Authentication Security**
   - JWT with refresh token mechanism
   - Password hashing with bcrypt
   - Token expiration and refresh handling

3. **Privacy-First Design**
   - Pseudonymous accounts with minimal PII
   - Data minimization principles
   - User control over data and connections

4. **API Security**
   - Input validation
   - CORS configuration
   - Rate limiting (to be implemented)

## Testing Strategy

The project includes:

1. **Backend Tests**
   - Unit tests for services and utilities
   - Integration tests for API endpoints
   - Mock Claude API responses for testing

2. **Frontend Tests**
   - Component tests with React Testing Library
   - Redux state management tests
   - Mock API responses for testing UI flows

## Deployment Considerations

For production deployment, consider:

1. **Infrastructure**
   - Containerization with Docker
   - AWS ECS for container orchestration
   - RDS for database
   - Load balancing and auto-scaling

2. **CI/CD**
   - GitHub Actions for automated testing and deployment
   - Separate staging and production environments
   - Security scanning in the CI pipeline

3. **Monitoring**
   - CloudWatch for logs and metrics
   - Sentry for error tracking
   - Performance monitoring

## Development Workflow

The recommended development workflow is:

1. Set up the local development environment with the instructions in GETTING_STARTED.md
2. Run both frontend and backend in development mode
3. Make changes following the modular architecture
4. Write tests for new features
5. Submit pull requests for review

## Future Enhancements

Potential future enhancements include:

1. **Additional Relationship Tools**
   - Guided exercises for specific relationship challenges
   - Progress tracking and relationship health metrics
   - Customized advice based on relationship history

2. **Platform Extensions**
   - Mobile applications for iOS and Android
   - Offline support with message queuing
   - Notification system for messages and invitations

3. **Advanced Claude Integration**
   - More specialized prompt templates for specific relationship issues
   - Multi-session context awareness
   - Integration with external relationship resources

4. **Analytics and Improvements**
   - Anonymous usage patterns to improve the platform
   - Effectiveness metrics for counseling sessions
   - User feedback collection and analysis

## Ethical Guidelines

When developing and enhancing Coco, adhere to these ethical guidelines:

1. **Transparency**: Clearly communicate what Coco is and is not (not a therapy replacement)
2. **User Control**: Give users complete control over their data
3. **Safety First**: Implement safeguards for crisis situations
4. **Privacy**: Maintain strict privacy and data protection standards
5. **Inclusivity**: Design for diverse relationship types and user needs
6. **Continual Improvement**: Regular review of Claude's prompts and responses

## Conclusion

The Coco Counseling platform provides a secure, privacy-focused foundation for delivering relationship support through Claude. By positioning it as a supportive friend rather than a therapy replacement, while implementing professional-grade security measures, we create an accessible tool for improving communication and relationship health.

The modular architecture allows for easy extension and maintenance, while the comprehensive testing strategy ensures reliability. With the planned future enhancements, Coco has the potential to become an even more valuable resource for relationship support.