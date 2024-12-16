# Campus Connect

A web application that helps King's College London students manage their lecture schedules and train journeys from Leagrave station.

## Features

- 📅 Calendar integration with lecture schedules
- 🚂 Real-time train information
- 🌙 Dark mode support
- 📱 Mobile-responsive design
- 🔒 Google OAuth authentication
- 💾 Client and server-side caching
- 📊 Weekly view calendar with train times
- 🔄 Monday-first week view
- 🚉 Train time hover cards
- 📱 Fully responsive mobile layout

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB (v6 or higher)
- Git

## Project Structure

```
campusconnect/
├── src/
│   ├── client/               # Frontend React application
│   │   ├── src/              # React source files
│   │   │   ├── components/   # React components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── services/     # API services
│   │   │   └── utils/        # Utility functions
│   │   ├── public/           # Static assets
│   │   └── dist/             # Built frontend files
│   └── server/               # Backend Node.js application
│       ├── routes/           # API routes
│       ├── services/         # Business logic
│       ├── models/           # Database models
│       └── utils/            # Utility functions
├── package.json              # Project dependencies
└── .env                      # Environment variables
```

## Build Process

The application consists of two main parts that need to be built separately:

1. **Backend (Node.js/Express)**
   - Uses CommonJS modules
   - Runs directly with Node.js
   - No build step required, just install dependencies

2. **Frontend (React/TypeScript)**
   - Uses ES modules
   - Requires TypeScript compilation
   - Needs to be built with Vite
   - Outputs to `src/client/dist`

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/campusconnect.git
   cd campusconnect
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Install and build frontend**
   ```bash
   cd src/client
   npm install
   npm run build   # For production build
   # OR
   npm run dev     # For development with hot reload
   ```

5. **Start the development server**
   ```bash
   # From project root
   npm run dev     # Starts both frontend and backend in development mode
   ```

## Development Workflow

1. **Local Development**
   - Run `npm run dev` for hot-reload development
   - Frontend runs on port 5173
   - Backend runs on port 3000
   - Changes to frontend code trigger automatic rebuilds
   - Changes to backend code trigger server restart

2. **Testing Changes**
   - Write tests for new features
   - Run `npm test` to execute test suite
   - Ensure all tests pass before committing

3. **Production Build**
   - Run `npm run build` to create production build
   - Test the production build locally
   - Commit and push changes
   - Deploy to production server

## Troubleshooting

1. **MongoDB Connection Issues**
   - Ensure MongoDB service is running
   - Check MongoDB connection string in `.env`
   - Verify MongoDB port is accessible

2. **Build Errors**
   - Clear `node_modules` and reinstall dependencies
   - Check for TypeScript errors
   - Verify all required dependencies are installed

3. **Deployment Issues**
   - Check Nginx configuration
   - Verify SSL certificate setup
   - Check systemd service logs