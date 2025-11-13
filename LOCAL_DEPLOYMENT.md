# 🏠 Local Deployment Guide - TicketDot

## Prerequisites

Before deploying locally, ensure you have:

- ✅ Rust toolchain installed
- ✅ `cargo-contract` installed (fixed version with Visual C++ build tools)
- ✅ Node.js 20+ for frontend

---

Install Dependencies

**Windows PowerShell:**

```powershell
# Install Rust (if not already installed)
winget install Rustlang.Rustup

# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Install cargo-contract
cargo install cargo-contract --force --locked

# Add Rust source component
rustup component add rust-src --toolchain stable-x86_64-pc-windows-msvc

# Install Node.js (if not already installed)
winget install OpenJS.NodeJS.LTS
```

## Option 1: Using Substrate Contracts Node (Recommended for Testing)

```
docker build -t ink-local .
docker run -it --rm -p 9944:9944 -v "${PWD}/contract:/workspace" ink-local
cargo contract build --release

```

# If using Docker

Run the local node with:

```
/contracts-node/target/release/substrate-contracts-node --dev --rpc-external --rpc-cors all --unsafe-rpc-external
```

Try this if above fails:

```
substrate-contracts-node --dev --tmp
```

This will start a local blockchain at `ws://127.0.0.1:9944` with:

- ✅ Development mode (instant block production)
- ✅ Temporary storage (reset on restart)
- ✅ Pre-funded development accounts
- Goto Step 4

### Step 3: Build Your Contract (Without Docker)

```powershell
cd contract
rustup component add rust-src --toolchain stable-x86_64-pc-windows-msvc
cargo contract build --release
```

This creates:

- `target/ink/ticketdot.contract` - Complete contract bundle
- `target/ink/ticketdot.wasm` - WebAssembly binary
- `target/ink/ticketdot.json` - Contract metadata

### Step 4: Deploy Contract via UI

1. **Open Contracts UI**: https://contracts-ui.substrate.io/
2. **For Local Node & Docker**: https://polkadot.js.org/apps

3. **Connect to Local Node**:

   - Click network selector (top left)
   - Select "Local Node"
   - Ensure it shows `ws://127.0.0.1:9944`

4. **Upload & Deploy**:

   - Click "Add New Contract"
   - Choose "Upload New Contract Code"
   - Select `target/ink/ticketdot.contract`
   - Click "Next"
   - Constructor: `new()` (default)
   - Click "Upload and Instantiate"
   - Select "Alice" account (has funds)
   - Sign transaction

5. **Save Contract Address**:
   - After deployment, copy the contract address
   - Example: `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`

### Step 5: Update Frontend Configuration

Edit `frontend/.env`:

```env
// Change to local node
VITE_WS_PROVIDER = "ws://127.0.0.1:9944";

// Paste your deployed contract address
VITE_CONTRACT_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
```

Also update contract metadata:

```powershell
# Copy metadata to frontend
cp contract/target/ink/ticketdot.json frontend/src/contract-metadata.json
```

### Step 6: Start Frontend

```powershell
cd frontend
npm run dev
```

Visit http://localhost:3001

### Step 7: Get Test Tokens

The local node comes with pre-funded accounts:

- **Alice**: `Address`
- **Bob**: `Address`

Import these into Polkadot.js extension:

1. Open Polkadot.js extension
2. Click "+" → "Import account from pre-existing seed"
3. Use development seeds:
   - Alice: `//Alice`
   - Bob: `//Bob`

---
