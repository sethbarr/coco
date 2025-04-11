# Getting Started with Coco Counseling

This guide will help you set up and run the Coco Counseling platform locally for development purposes.

## Prerequisites

Before you begin, make sure you have the following installed:

- Node.js (v16 or higher)
- npm or yarn package manager
- PostgreSQL (v13 or higher)
- Git

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/coco-counseling.git
cd coco-counseling
```

## Step 2: Set Up the Backend

### Install Dependencies

```bash
cd backend
npm install
```

### Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
touch .env
```

Add the following environment variables to the `.env` file:

```
# Server settings
PORT=3001
NODE_ENV=development

# Database connection
DATABASE_URL="postgresql://postgres:password@localhost:5432/coco_counseling"

# JWT Secret
JWT_SECRET="your_jwt_secret_key_change_this_in_production"

# Anthropic API
ANTHROPIC_API_KEY="your_anthropic_api_key"

# Security settings
CORS_ORIGIN="http://localhost:3000"
```

Make sure to:
- Replace `postgres:password` with your PostgreSQL username and password
- Replace `your_jwt_secret_key_change_this_in_production` with a secure random string
- Replace `your_anthropic_api_key` with your actual Anthropic API key

### Set Up the Database

Create the database:

```bash
psql -U postgres
```

In the PostgreSQL console:

```sql
CREATE DATABASE coco_counseling;
\q
```

Run database migrations:

```bash
npx prisma migrate dev --name init
```

### Start the Backend Server

```bash
npm run dev
```

The backend should now be running on http://localhost:3001.

## Step 3: Set Up the Frontend

### Install Dependencies

In a new terminal window:

```bash
cd ../frontend
npm install
```

### Configure Environment Variables

Create a `.env` file in the frontend directory:

```bash
touch .env
```

Add the following:

```
REACT_APP_API_URL=http://localhost:3001/api
```

### Start the Frontend Development Server

```bash
npm start
```

The frontend should now be running on http://localhost:3000.

## Step 4: Testing the Application

1. Open your browser and navigate to http://localhost:3000
2. Register a new user account
3. Explore the different features:
   - Start an individual conversation with Coco
   - Invite another user to connect
   - Create a joint session

## Troubleshooting

### Database Connection Issues

If you encounter database connection problems:

1. Check that PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Verify your connection string in the `.env` file matches your PostgreSQL configuration

3. Ensure the database exists:
   ```bash
   psql -U postgres -l
   ```

### API Connection Issues

If the frontend cannot connect to the backend:

1. Check that both servers are running
2. Verify the CORS settings in the backend
3. Ensure the `REACT_APP_API_URL` in the frontend environment matches the running backend URL

## Development Workflow

1. **Backend Changes**:
   - Modify routes in `backend/src/routes/`
   - Update database models in `backend/prisma/schema.prisma`
   - Run `npx prisma migrate dev` after schema changes

2. **Frontend Changes**:
   - Components are in `frontend/src/components/`
   - State management with Redux in `frontend/src/store/`
   - API calls through the utility in `frontend/src/utils/api.ts`

3. **Testing**:
   - Backend: `cd backend && npm test`
   - Frontend: `cd frontend && npm test`

4. **Building for Production**:
   - Backend: `cd backend && npm run build`
   - Frontend: `cd frontend && npm run build`

## Working with End-to-End Encryption

Coco uses client-side encryption to secure user messages:

1. When a user registers, a public/private key pair is generated
2. The private key is stored in the user's browser (localStorage)
3. The public key is sent to the server
4. Messages are encrypted with the recipient's public key before sending
5. Messages are decrypted with the user's private key after receiving

To test the encryption functionality:

1. Register two user accounts in different browsers or incognito windows
2. Create a connection between them
3. Start a joint session and exchange messages
4. Verify that messages are encrypted in transit by checking network requests

## Deploying to Production

For production deployment:

1. Set up a proper database with backups
2. Configure strong JWT secrets and secure environments
3. Set up HTTPS with valid certificates
4. Configure proper CORS settings
5. Follow the deployment instructions in `infrastructure/README.md`

## Claude API Integration

The Coco platform uses Claude as its AI counselor through the Anthropic API:

1. Set up an Anthropic API key and add it to your backend `.env` file
2. The system prompt for Claude is defined in `backend/src/services/claude.js`
3. You can modify this prompt to adjust Claude's counseling style and boundaries
4. Different prompts are used for individual and joint sessions

## Data Privacy Considerations

When developing features for Coco, always keep data privacy in mind:

1. Minimize data collection and storage
2. Implement proper data deletion functionality
3. Ensure all communications are encrypted
4. Provide clear privacy controls to users
5. Follow the data minimization practices outlined in the developer guide

## Contributing

See `CONTRIBUTING.md` in the project root for guidelines on:

1. Code style and formatting
2. Pull request process
3. Development workflow
4. Testing requirements

## Getting Help

If you encounter issues or have questions:

1. Check the existing documentation in the `docs/` directory
2. Review the developer guide for detailed implementation information
3. Open an issue on GitHub for bugs or feature requests