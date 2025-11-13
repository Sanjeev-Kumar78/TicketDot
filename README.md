# 🎫 TicketDot - Decentralized Ticket Booking on Polkadot

> A blockchain-verified ticket booking platform built on Astar Network that eliminates fraud by representing each ticket as an NFT.

## 🌟 Overview

TicketDot is a decentralized application (DApp) that revolutionizes event ticketing by:

<a target="_blank">
<img align="right" src="frontend/public/TicketDot_Icon_Dark.png#gh-dark-mode-only" width="120" height="120"/>
<img align="right" src="frontend/public/TicketDot_Icon_Light.png#gh-light-mode-only" width="120" height="120"/>
</a>

- **Preventing Fraud:** Each ticket is a blockchain-verified NFT
- **Eliminating Scalping:** Transparent pricing and ownership records
- **Empowering Organizers:** Direct sales without intermediaries
- **Ensuring Authenticity:** Cryptographic proof of ticket validity

### The Problem

- Traditional ticketing loses **$1 billion+ annually** to counterfeit tickets
- Scalper bots buy tickets in bulk, inflating prices
- No verifiable proof of ticket authenticity
- High platform fees and centralized control

### Our Solution
TicketDot uses **Polkadot's Astar Network** and **Ink! smart contracts** to create tamper-proof, transferable NFT tickets that solve these issues at the protocol level.

- Project Pitch and Details: See [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)

https://github.com/user-attachments/assets/3e65f4ae-6d40-4dce-90a3-d4373ecebdb2

---

## 🎯 Key Features

### For Event Organizers

- ✅ Create events with custom pricing and capacity
- ✅ Receive payments directly via smart contract
- ✅ Real-time inventory tracking
- ✅ No platform fees (only gas costs)

### For Ticket Buyers

- ✅ Wallet-based authentication (no passwords)
- ✅ NFT tickets with on-chain verification
- ✅ Transfer tickets to friends securely
- ✅ Permanent purchase history

### Technical Highlights

- 🔒 **Secure:** Built with Rust and Ink! for memory safety
- ⚡ **Fast:** WebAssembly execution on Astar
- 🌐 **Decentralized:** IPFS metadata storage (roadmap)
- 🔗 **Interoperable:** PSP34 NFT standard compatible

---

## 🏗️ Tech Stack

| Layer                | Technology                   |
| -------------------- | ---------------------------- |
| **Smart Contract**   | Ink! 5.0 (Rust)              |
| **Blockchain**       | Polkadot                     |
| **Frontend**         | React 19 + TypeScript + Vite |
| **Web3 Integration** | Polkadot.js API              |
| **UI Framework**     | TailwindCSS 4.x              |
| **NFT Standard**     | PSP34 (Polkadot)             |
| **Build Tools**      | cargo-contract, npm          |

---

## 📦 Project Structure

```
ticketdot/
├── contract/              # Ink! smart contract
│   ├── lib.rs            # Main contract logic
│   ├── Cargo.toml        # Rust dependencies
│   └── target/ink/       # Compiled contract
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── contexts/     # Polkadot.js integration
│   │   ├── pages/        # Routes (Home, Create, Tickets)
│   │   └── App.tsx       # Main app
│   └── package.json
├── PROJECT_OVERVIEW.md   # Project pitch & features
├── README.md             # This file
└── LICENSE               # MIT License
```

---

## Local Development & Deployment

- Follow:
- [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md)

## 🔧 Installation & Setup

### Prerequisites

1. **Rust & Cargo**

   ```powershell
   # Install Rust
   Invoke-WebRequest -Uri https://win.rustup.rs -OutFile rustup-init.exe
   .\rustup-init.exe

   # Add wasm32 target
   rustup target add wasm32-unknown-unknown

   # Rust source component
   rustup component add rust-src --toolchain stable-x86_64-pc-windows-msvc
   ```

2. **cargo-contract**

   ```powershell
   cargo install cargo-contract --force --locked
   ```

3. **Node.js (v18+)**
   Download from: https://nodejs.org/

4. **Polkadot.js Extension**
   - Chrome: https://chrome.google.com/webstore/detail/polkadot-js-extension/mopnmbcafieddcagagdcbnhejhlodfdd
   - Firefox: https://addons.mozilla.org/firefox/addon/polkadot-js-extension/

### Smart Contract Deployment

```powershell
# Navigate to contract directory
cd contract

# Build the contract
cargo contract build --release

# Deploy to Shibuya testnet
cargo contract upload --suri "//YourSeedPhrase" `
  --url wss://rpc.shibuya.astar.network

# Instantiate
cargo contract instantiate --suri "//YourSeedPhrase" `
  --url wss://rpc.shibuya.astar.network `
  --constructor new
```

### Frontend Setup

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure contract address in src/contexts/PolkadotContext.tsx
# Update CONTRACT_ADDRESS variable

# Run development server
npm run dev
```

## **Access at:** `http://localhost:3000`

## 🎬 How It Works

### 1. Create Event

```
Organizer → Frontend → Smart Contract
- Event name, price, capacity
- Metadata stored on-chain
- Event ID generated
```

### 2. Buy Ticket

```
Buyer → Frontend → Smart Contract
- Payment sent with transaction
- NFT ticket minted
- Ownership recorded on-chain
- Funds transferred to organizer
```

### 3. Verify & Transfer

```
Owner → Smart Contract
- Ownership verified
- Transfer to recipient
- New owner recorded
- Event emitted
```

---

### Frontend (Manual Testing)

1. Connect wallet
2. Create test event
3. Purchase ticket
4. View in "My Tickets"
5. (Optional) Transfer ticket

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b {branch-name}`)
3. Commit your changes (`git commit -m '{commit-message}'`)
4. Push to branch (`git push origin {branch-name}`)
5. Open a Pull Request

---

## 📄 License

- This project is licensed under the **MIT License** - see [LICENSE](./LICENSE) file.

## 🙏 Acknowledgments

- **Polkadot Foundation** - For the amazing ecosystem
- **Parity Technologies** - For Substrate and Ink!
- **OpenBrush** - For NFT standard implementations
- **Polkadot.js Team** - For the excellent API and tooling
- **React Community** - For the robust frontend framework
- **TypeScript** - For enhancing JavaScript with types

---

## 🔗 Useful Links

- **Polkadot:** https://polkadot.network/
- **Ink! Docs:** https://use.ink/
- **Polkadot.js:** https://polkadot.js.org/
- **Substrate:** https://substrate.io/
- **Polkadot.js Developer Interface:** https://polkadot.js.org/apps

---

<div align="center">

**Built with ❤️ for the Polkadot Ecosystem**

⭐ **Star this repo if you find it helpful!** ⭐

</div>
