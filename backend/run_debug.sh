#!/bin/bash
DATABASE_URL="postgresql://postgres:password@localhost:5433/vessify?schema=public" npx tsx src/index.ts > server.log 2>&1
