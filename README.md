Room Billing PWA
=================

This is a minimal PWA + Express backend for room billing (tính tiền trọ).
You already have a MongoDB — set environment variable MONGODB_URI to point to it.

How to run:

1. Put project files on your server or local machine.
2. Install dependencies:
   npm install
3. Set env:
   export MONGODB_URI='mongodb://user:pass@host:port/dbname'
4. Start server:
   npm start
5. Open browser at http://localhost:3000

Notes:
- Frontend (index.html) calls API endpoints under /api/*
- Service worker configuration excludes /api/* from caching to ensure fresh data
- Adjust electricity/water unit prices in server.js as needed
