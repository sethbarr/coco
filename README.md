# Coco Counseling Platform

A relationship counseling platform that uses Claude as its AI counselor, facilitating individual and joint conversations between partners or family members who need accessible, affordable relationship support.

## Project Overview

Coco is positioned as a "mutual friend" counselor rather than a professional therapy replacement. The platform provides a secure, private environment for users to discuss relationship issues and improve their communication skills.

## Key Features

- **User Authentication & Privacy**: Pseudonymous accounts with minimal PII collection and end-to-end encrypted conversations
- **Conversation Management**: Individual private conversations with Claude and joint sessions with multiple participants
- **Relationship Tools**: Communication exercises, relationship health tracking, and guided conflict resolution
- **Secure Architecture**: Encrypted data storage, API security, and privacy-first design

## Technology Stack

### Frontend
- React with TypeScript
- Redux Toolkit for state management
- Tailwind CSS for styling
- Jest and React Testing Library for testing

### Backend
- Node.js with Express
- PostgreSQL database with Prisma ORM
- JWT authentication with refresh tokens
- libsodium for end-to-end encryption

## Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL
- Anthropic API key

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd coco-counseling
   ```

2. Install dependencies
   ```
   npm run install-all
   ```

3. Set up environment variables
   - Create a `.env` file in the backend directory based on the `.env.example` template
   - Add your Anthropic API key and database connection string

4. Set up the database
   ```
   cd backend
   npx prisma migrate dev
   ```

5. Start the development servers
   ```
   cd ..
   npm start
   ```

## Project Structure

```
coco-counseling/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/          # Redux store and slices
│   │   └── utils/          # Utility functions
├── backend/                # Node.js backend API
│   ├── prisma/             # Prisma schema and migrations
│   └── src/
│       ├── routes/         # API routes
│       ├── services/       # Business logic
│       └── middleware/     # Express middleware
└── infrastructure/         # Deployment configurations
```

## Security and Privacy

Coco implements end-to-end encryption for all user messages, ensuring that sensitive conversation data remains private. The application also follows data minimization practices, collecting only the information necessary for the platform to function.

## Development Roadmap

### Phase 1: Foundation
- Basic user authentication
- Claude API integration
- Individual conversations
- E2E encryption implementation

### Phase 2: Relationship Features
- User connections
- Joint sessions
- Basic communication exercises
- Conversation history and context

### Phase 3: Enhancement
- Mobile optimization
- Additional relationship tools
- User experience refinement
- Performance optimization

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Anthropic for the Claude API
- All contributors who have helped shape this project