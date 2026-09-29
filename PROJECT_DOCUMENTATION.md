ChainTrace --- Project Documentation

1. Overview

ChainTrace is a Smart India Hackathon 2026 prototype for Problem
Statement SIH26183.

The platform is designed around the workflow of receiving a
victim-reported cryptocurrency wallet address, tracing fund movement,
detecting suspicious behavior, identifying possible VASP/exchange
exposure, preserving evidence-oriented findings, and preparing
investigation outputs.

2. Investigation Lifecycle

Case Creation

Cases contain investigation information such as case ID, name, priority,
status, incident details, report references, and estimated loss.

Suspect Wallet Intake

An investigator submits a reported wallet address. The primary
demonstration workflow focuses on TRON and TRC-20 USDT.

Blockchain Data Collection

Transactions are normalized into a common structure:

{
  "chain": "TRON",
  "transactionHash": "transaction_hash",
  "from": "source_wallet",
  "to": "destination_wallet",
  "token": "USDT",
  "amount": 1000,
  "timestamp": "timestamp",
  "blockNumber": 123456
}

Optional fields can include transaction status, contract address, and
data source.

Fund Tracing

Reported Wallet
      ↓
Intermediary A
      ↓
Intermediary B
      ↓
Intermediary C
      ↓
Possible VASP Deposit

The tracing engine records wallet-to-wallet relationships and
transaction hops.

Transaction Graph

Wallets are represented as nodes and transactions as directed edges. The
graph displays fund flow, amounts, token information, wallet types, and
hop relationships.

3. Suspicious Pattern Engine

The prototype can identify analytical indicators such as:

Rapid movement

Fund splitting

Multi-hop layering

Possible VASP deposit

These are analytical findings, not automatic proof of criminal activity.

4. VASP Intelligence

VASP intelligence can include:

VASP name

Blockchain

Known address

Source

Confidence

Supporting evidence

Analytical notes

Possible attribution must be distinguished from confirmed ownership.

5. Confidence and Evidence

Evidence-oriented findings can reference:

Transaction hash

Wallet address

Timestamp

Block number

Amount

Direction

Data source

Graph relationship

Pattern result

VASP intelligence

The purpose is to make findings explainable and auditable.

6. Risk Analysis

Risk is derived from observed indicators such as hop count, rapid
movement, splitting, layering, and possible VASP exposure.

Risk is an analytical output and not a legal conclusion.

7. Monitoring and Alerts

The monitoring architecture supports continued observation of relevant
wallets/investigations.

Example alerts:

Rapid Fund Movement Detected

Possible VASP Deposit Address Identified

Suspicious Transaction Pattern Detected

Alerts can be acknowledged and connected to cases.

8. Reporting

Reports can contain:

Case information

Reported wallet

Blockchain and asset

Transaction summary

Hop analysis

Findings

Patterns

VASP intelligence

Risk

Evidence references

Investigation notes

9. Audit Trail

The audit architecture can record actions such as case creation, wallet
intake, investigation execution, findings, alert actions, report
generation, and integration actions.

10. NCRP / SAHYOG / LEA Architecture

NCRP

NCRP Complaint
      ↓
Complaint Intake
      ↓
Wallet Extraction
      ↓
Blockchain Investigation

Real NCRP API access requires authorized credentials.

SAHYOG

The project provides a coordination workflow for inter-agency
information sharing. Real portal access requires authorization.

LEA Export

Investigation information can be structured for inter-agency handoff.

11. VASP Coordination

A structured coordination package can contain:

Case
 ↓
Reported Wallet
 ↓
Transaction Evidence
 ↓
Possible VASP
 ↓
Confidence + Evidence
 ↓
Information Request Package

Actual delivery requires appropriate legal and organizational
coordination.

12. Demo/Fallback Architecture

When external services are unavailable, deterministic demo data can keep
the prototype usable.

Demo screens should clearly distinguish:

DEMO

MOCK DATA

ARCHITECTURE READY

REAL API ACCESS REQUIRED

The application must not pretend that an external government or VASP
system was contacted when it was not.

13. Data Model

Main collections/entities include:

users
cases
wallets
transactions
transactionEdges
investigations
findings
vaspIntelligence
alerts
monitoring
reports
auditLogs
dataSources

Conceptual relationship:

Case
 ├── Wallets
 ├── Investigation
 │    ├── Transactions
 │    ├── Graph Edges
 │    ├── Findings
 │    ├── VASP Intelligence
 │    └── Risk
 ├── Alerts
 ├── Reports
 └── Audit Logs

14. Technology Architecture

React + Vite + Tailwind + Cytoscape
              │
              ▼
       Node.js + Express
              │
       ┌──────┴──────┐
       ▼             ▼
   MongoDB      Blockchain Layer
                TRON / Ethereum / Bitcoin

15. Security

The project uses or is designed around:

JWT authentication

bcrypt password hashing

Helmet security headers

Rate limiting

Input validation

CORS controls

Environment-based secrets

Never commit .env, API keys, passwords, private keys, or other
secrets.

16. Multi-Chain Architecture

TRON/TRC-20 USDT is the primary demonstration workflow. The architecture
is adapter-based for future Ethereum and Bitcoin support.

Blockchain Adapter Layer
        │
   ┌────┼────┐
   ▼    ▼    ▼
 TRON  ETH  BTC

17. Responsible Use

Important distinctions:

Wallet Address
      ≠
Known Person

Possible VASP Attribution
      ≠
Confirmed Ownership

Risk Indicator
      ≠
Proof of Crime

Important findings should be validated using authoritative sources,
legal procedures, and preserved evidence.

18. Prototype Scope

The prototype demonstrates:

Authentication

Case management

Wallet intake

Blockchain investigation workflow

Multi-hop tracing

Transaction graph

Pattern detection

VASP intelligence

Confidence/evidence

Risk analysis

Monitoring

Alerts

Reports

Audit trail

NCRP/SAHYOG/LEA integration architecture

VASP coordination

Demo fallback

19. Future Improvements

Potential future work:

Authorized live blockchain providers

Broader multi-chain coverage

Advanced graph analytics

Production ML models

Larger VASP intelligence datasets

Authorized government API integrations

Advanced evidence preservation

Distributed processing for large graphs

Production observability

Enterprise access control and deployment

20. Disclaimer

ChainTrace is a Smart India Hackathon prototype.

Demo and mock data may be used where real external access is
unavailable.

The project does not claim guaranteed criminal attribution, guaranteed
VASP ownership, complete blockchain coverage, automatic asset freezing,
or real government API submission without authorization.