# Adaptive Learning Web Platform for Primary School Students with ADHD

## Overview
A full-stack web application designed to support primary school students with ADHD. The platform serves three distinct role-based areas (student, parent, and teacher) from a unified application.

The core architectural principle of this platform is **Backend-driven logic**. The backend acts as the source of truth, handling all decisions, calculations, adaptive engine logic, and scoring. The frontend functions as a secure presentation and data-collection layer, ensuring that learning progress cannot be manipulated client-side.

## Project Structure
This project is organized as a monorepo, cleanly separating the client and server codebases:

- **/frontend**: A React application built with Vite. It features a feature-based modular structure, Tailwind CSS for styling (with child/adult themes), shadcn/ui for accessible components, and motion libraries (Framer Motion, GSAP) for reward animations.
- **/backend**: A Node.js + Express + TypeScript REST API with a layer-based architecture (routes → controllers → services → repositories → Prisma/PostgreSQL). See [`backend/README.md`](backend/README.md).

## Architecture Highlights
- **Client-server architecture**: The React app communicates with the backend exclusively through a centralized REST API over HTTPS.
- **Component-based architecture**: Screens are built from reusable, accessible components shared across all user areas.
- **Feature-based modular structure**: Frontend code is grouped by feature (e.g., `survey`, `quizzes`, `rewards`, `dashboards`) rather than file type, ensuring features can be developed and tested independently.

## Getting Started

### Frontend Development
To run the frontend locally:

`ash
cd frontend
npm install
npm run dev
`

### Backend Development
To run the backend locally (requires PostgreSQL for database features):

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The API runs on `http://localhost:5000`. Health check: `GET /api/v1/health`. See [`backend/README.md`](backend/README.md) for scripts, environment variables and the folder structure.
