FROM rust:1.85.0-slim

RUN apt-get update && apt-get install -y \
    git clang curl libssl-dev pkg-config cmake build-essential \
    protobuf-compiler llvm-dev libclang-dev clang && \
    rm -rf /var/lib/apt/lists/*

# Add wasm target & rust-src
RUN rustup target add wasm32-unknown-unknown && \
    rustup component add rust-src

ENV PATH="/usr/bin:${PATH}"
ENV PROTOC="/usr/bin/protoc"

RUN rustc --version && protoc --version

# Install a stable version of cargo-contract compatible with ink! v5
RUN cargo install --locked cargo-contract --version 3.2.0

# Clone and build substrate-contracts-node
RUN git clone https://github.com/paritytech/substrate-contracts-node.git /contracts-node
WORKDIR /contracts-node
RUN cargo build --release

EXPOSE 9944
WORKDIR /workspace

# Add the binary to PATH or use full path in entrypoint
ENTRYPOINT ["/bin/bash", "-c", "if [ -f /contracts-node/target/release/substrate-contracts-node ]; then echo 'Starting substrate-contracts-node...'; /contracts-node/target/release/substrate-contracts-node --dev --rpc-external --rpc-cors all --unsafe-rpc-external & else echo 'substrate-contracts-node binary not found. Build may have failed.'; fi; bash"]
