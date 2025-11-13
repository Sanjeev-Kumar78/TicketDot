import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePolkadot } from "../contexts/PolkadotContext";
import { web3FromAddress } from "@polkadot/extension-dapp";
import { toast } from "react-toastify";
import { toSmallestUnit } from "../utils/currency";

const CreateEvent = () => {
  const { contract, api, selectedAccount, isConnected } = usePolkadot();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    totalTickets: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !selectedAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!contract || !api) {
      toast.error("Contract not initialized");
      return;
    }

    try {
      setLoading(true);

      // For demo, we'll use a placeholder IPFS CID
      // In production, you would upload to IPFS first
      const metadataCid = `QmDemo${Date.now()}`;

      // Convert price to smallest unit (similar to wei in Ethereum)
      const priceInSmallestUnit = toSmallestUnit(formData.price);

      // Gas limit for contract call (using -1 for auto-estimation)
      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 10000000000n,
        proofSize: 1000000n,
      }) as any;

      const injector = await web3FromAddress(selectedAccount.address);

      // Call create_event - pass price as bigint directly, not as string
      const tx = await contract.tx.createEvent(
        { gasLimit, storageDepositLimit: null },
        formData.name,
        priceInSmallestUnit, // Pass bigint directly
        parseInt(formData.totalTickets),
        metadataCid
      );

      await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isInBlock) {
            toast.info("Transaction included in block");
          } else if (status.isFinalized) {
            toast.success("Event created successfully!");
            navigate("/");
          }
        }
      );
    } catch (error) {
      toast.error("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-white text-xl">
          Please connect your wallet to create events
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-8 text-center">
        Create New Event
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-8 border border-purple-500"
      >
        <div className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-white font-semibold mb-2"
            >
              Event Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-900 text-white border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Polkadot Conference 2025"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-white font-semibold mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-3 bg-gray-900 text-white border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter event description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="price"
                className="block text-white font-semibold mb-2"
              >
                Ticket Price (Unit)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="1"
                className="w-full px-4 py-3 bg-gray-900 text-white border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="50"
              />
            </div>

            <div>
              <label
                htmlFor="totalTickets"
                className="block text-white font-semibold mb-2"
              >
                Total Tickets
              </label>
              <input
                type="number"
                id="totalTickets"
                name="totalTickets"
                value={formData.totalTickets}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-4 py-3 bg-gray-900 text-white border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="100"
              />
            </div>
          </div>

          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              💡 <strong>Note:</strong> Event metadata will be stored on IPFS
              for decentralized access. Once created, events are immutable on
              the blockchain.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition"
          >
            {loading ? "Creating Event..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;
