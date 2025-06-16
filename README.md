# KalySwap Frontend

This is the user-facing frontend for the KalySwap decentralized exchange platform. It provides a user interface for interacting with the KalySwap DEX on KalyChain.

## Features

- User registration and login
- Wallet creation and management
- Secure wallet export functionality
- Balance checking for KLC and tokens
- Integration with the KalySwap backend API

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm or yarn
- Backend API running (default: http://localhost:3000)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

### Development

Start the development server:

```bash
npm run dev
```

The frontend will be available at http://localhost:3002

### Building for Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
src/
├── app/                  # Next.js app router
│   ├── dashboard/        # Dashboard page
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # Reusable components
├── utils/                # Utility functions
└── ...
```

## Integration with Backend

The frontend communicates with the backend API using GraphQL. The API endpoint is configured in `next.config.ts` to proxy requests to the backend server.

## Authentication

Authentication is handled using JWT tokens. When a user logs in or registers, a token is stored in localStorage and used for authenticated requests.

## Wallet Management

The frontend provides functionality for:
- Creating new wallets
- Viewing wallet balances
- Exporting wallets as JSON keystores

## Future Enhancements

- Trading interface
- Liquidity provision
- Staking functionality
- Bridge integration
- Advanced wallet features (transaction history, sending tokens)
- Mobile responsiveness improvements
