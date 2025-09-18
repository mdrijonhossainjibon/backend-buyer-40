# EarnFrom Backend

A TypeScript Express server for the EarnFrom application.

## Features

- ✅ TypeScript for type safety
- ✅ Express.js web framework
- ✅ Security middleware (Helmet)
- ✅ CORS support
- ✅ Request logging (Morgan)
- ✅ Environment configuration
- ✅ Error handling
- ✅ Health check endpoint
- ✅ Development hot reload

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd earnfrom-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration values.

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript project
- `npm start` - Start the production server
- `npm run clean` - Clean the dist directory

## Development

To start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Health Check
- **GET** `/health` - Server health status

### API Routes
- **GET** `/api` - API information
- **GET** `/api/users` - Get all users (example)
- **POST** `/api/users` - Create a new user (example)

## Project Structure

```
earnfrom-backend/
├── src/
│   └── server.ts          # Main server file
├── dist/                  # Compiled JavaScript (generated)
├── .env                   # Environment variables
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |

## Building for Production

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Error Handling

The server includes comprehensive error handling:
- Global error handler for unhandled errors
- 404 handler for unknown routes
- Validation for required fields in POST requests

## Security

The server includes several security measures:
- Helmet.js for security headers
- CORS configuration
- Request body size limits
- Input validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

MIT License
