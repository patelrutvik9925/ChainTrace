ChainTrace --- Blockchain Fraud Investigation Platform

Smart India Hackathon 2026 --- SIH26183

ChainTrace is a blockchain fraud investigation prototype for analyzing
victim-reported cryptocurrency wallet addresses, tracing fund movement,
detecting suspicious transaction patterns, identifying possible
VASP/exchange exposure, and preparing investigation outputs.

Prototype disclaimer: Demo data and mock integration workflows may
be used. They are not live blockchain evidence, proof of criminal
identity, or proof of VASP ownership. Real NCRP/SAHYOG/VASP submission
requires authorized access.

Core Workflow

Victim-Reported Wallet
        ↓
Wallet Validation
        ↓
Blockchain Data Collection
        ↓
Multi-Hop Fund Tracing
        ↓
Transaction Graph
        ↓
Suspicious Pattern Detection
        ↓
VASP Intelligence
        ↓
Confidence + Evidence
        ↓
Risk Analysis
        ↓
Alerts / Monitoring
        ↓
Investigation Report
        ↓
LEA / NCRP / SAHYOG-Ready Output

Features

Authentication and user management

Case management

Suspect wallet intake and validation

TRON / TRC-20 USDT investigation workflow

Multi-hop fund tracing

Transaction normalization

Transaction graph visualization

Wallet classification

Suspicious pattern detection

VASP intelligence and attribution

Confidence and evidence analysis

Risk analysis

Monitoring and alerts

Investigation reports

Audit trail

LEA case export

NCRP intake architecture

SAHYOG coordination architecture

VASP coordination workflow

Deterministic demo/fallback mode

Technology Stack

Frontend

React

Vite

Tailwind CSS

Cytoscape.js

Backend

Node.js

Express.js

Database

MongoDB

Mongoose

MongoDB Atlas compatible

Security

JWT

bcrypt

Helmet

Rate limiting

Input validation

CORS

Environment variables

Blockchain Architecture

TRON / TronGrid primary

TRONSCAN secondary

Adapter architecture for Ethereum and Bitcoin

Architecture

React Frontend
      │
      ▼
Node.js / Express REST API
      │
 ┌────┴─────────────┐
 ▼                  ▼
MongoDB       Blockchain Adapters
              TRON / Ethereum / Bitcoin

Demo Mode

The application includes deterministic demo data so the investigation
workflow can be demonstrated when MongoDB or external blockchain
services are unavailable.

The demo investigation includes a sample TRON/TRC-20 USDT flow with
wallets, transactions, hops, suspicious patterns, possible VASP
intelligence, risk, alerts, findings, and report data.

Demo data is clearly identified and must not be treated as live
evidence.

Getting Started

Prerequisites

Node.js

npm

MongoDB/MongoDB Atlas (optional when using demo fallback)

Install

npm install

Environment

Create a .env file with the variables required by the project. Typical
values include:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret
PORT=5000

Never commit real secrets or API keys.

Run

Use the project's configured development command, for example:

npm run dev

The frontend is normally available at:

http://localhost:5173

Important Limitations

The prototype does not claim to:

Identify a real person from a wallet address

Guarantee exchange/VASP ownership

Break mixers or privacy systems

Provide complete blockchain coverage

Automatically freeze cryptocurrency

Replace legal or investigative procedures

Submit real NCRP/SAHYOG requests without authorized access

Project Status

Hackathon Prototype --- Demo Ready

Hackathon

Event: Smart India Hackathon 2026

Problem Statement: SIH26183

Project: ChainTrace

Domain: Blockchain / Cyber Crime Investigation