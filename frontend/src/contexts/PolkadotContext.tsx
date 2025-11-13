/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { ContractPromise } from "@polkadot/api-contract";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { toast } from "react-toastify";
import contractMetadata from "../contract-metadata.json";
// Astar Shibuya testnet endpoint
const WS_PROVIDER =
  import.meta.env.VITE_WS_PROVIDER || "wss://rpc.shibuya.astar.network";

// Replace with your deployed contract address
const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || "YOUR_CONTRACT_ADDRESS_HERE";

interface PolkadotContextType {
  api: ApiPromise | null;
  contract: ContractPromise | null;
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  isConnected: boolean;
  isLoading: boolean;
  connectWallet: () => Promise<void>;
  selectAccount: (account: InjectedAccountWithMeta) => void;
}

const PolkadotContext = createContext<PolkadotContextType>({
  api: null,
  contract: null,
  accounts: [],
  selectedAccount: null,
  isConnected: false,
  isLoading: true,
  connectWallet: async () => {},
  selectAccount: () => {},
});

export const usePolkadot = () => useContext(PolkadotContext);

interface PolkadotProviderProps {
  children: ReactNode;
}

export const PolkadotProvider: React.FC<PolkadotProviderProps> = ({
  children,
}) => {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [contract, setContract] = useState<ContractPromise | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<InjectedAccountWithMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize API connection
  useEffect(() => {
    const initApi = async () => {
      try {
        // Initialize WASM crypto first
        await cryptoWaitReady();

        const wsProvider = new WsProvider(WS_PROVIDER);
        const api = await ApiPromise.create({ provider: wsProvider });

        await api.isReady;
        setApi(api);

        // Initialize contract
        if (
          CONTRACT_ADDRESS &&
          CONTRACT_ADDRESS !== "YOUR_CONTRACT_ADDRESS_HERE"
        ) {
          const contract = new ContractPromise(
            api,
            contractMetadata,
            CONTRACT_ADDRESS
          );
          setContract(contract);
        }

        // Display appropriate connection message
        const chainName =
          WS_PROVIDER.includes("localhost") || WS_PROVIDER.includes("127.0.0.1")
            ? "Local Substrate Node"
            : WS_PROVIDER.includes("shibuya")
            ? "Astar Shibuya Testnet"
            : "Blockchain Network";

        toast.success(`Connected to ${chainName}!`);
      } catch (error) {
        toast.error("Failed to connect to blockchain");
      } finally {
        setIsLoading(false);
      }
    };

    initApi();
  }, []);

  const connectWallet = async () => {
    try {
      // Enable the extension
      const extensions = await web3Enable("TicketDot");

      if (extensions.length === 0) {
        toast.error("Please install Polkadot.js extension");
        window.open("https://polkadot.js.org/extension/", "_blank");
        return;
      }

      // Get all accounts
      const allAccounts = await web3Accounts();

      if (allAccounts.length === 0) {
        toast.error(
          "No accounts found. Please create an account in Polkadot.js extension"
        );
        return;
      }

      setAccounts(allAccounts);
      setSelectedAccount(allAccounts[0]);

      // Auto-map account on Astar if needed
      if (api && allAccounts[0]) {
        await mapAccountIfNeeded(allAccounts[0]);
      }

      toast.success("Wallet connected successfully!");
    } catch (error) {
      toast.error("Failed to connect wallet");
    }
  };

  const mapAccountIfNeeded = async (account: InjectedAccountWithMeta) => {
    if (!api) return;

    try {
      // Check if account is already mapped
      const mappingQuery = await api.query.unifiedAccounts?.evmAddresses(
        account.address
      );

      if (!mappingQuery || mappingQuery.isEmpty) {
        toast.info("Mapping account... This is required for Astar Network.");

        const injector = await web3FromAddress(account.address);

        // Derive EVM address from Substrate address
        const evmAddress = account.address; // Simplified - Astar handles this

        // Call claimEvmAddress to create mapping
        const tx = api.tx.unifiedAccounts?.claimEvmAddress(evmAddress);

        if (tx) {
          await tx.signAndSend(
            account.address,
            { signer: injector.signer },
            ({ status }) => {
              if (status.isInBlock) {
                toast.success("Account mapped successfully!");
              }
            }
          );
        }
      }
    } catch (error) {
      // Don't fail if mapping is not available (e.g., local node)
      // Silently skip account mapping on networks that don't require it
    }
  };

  const selectAccount = (account: InjectedAccountWithMeta) => {
    setSelectedAccount(account);
    toast.info(`Switched to account: ${account.meta.name}`);
  };

  const value: PolkadotContextType = {
    api,
    contract,
    accounts,
    selectedAccount,
    isConnected: !!selectedAccount,
    isLoading,
    connectWallet,
    selectAccount,
  };

  return (
    <PolkadotContext.Provider value={value}>
      {children}
    </PolkadotContext.Provider>
  );
};
