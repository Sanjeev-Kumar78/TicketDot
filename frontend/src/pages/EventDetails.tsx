import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePolkadot } from "../contexts/PolkadotContext";
import { web3FromAddress } from "@polkadot/extension-dapp";
import { toast } from "react-toastify";
import { fromSmallestUnit } from "../utils/currency";

interface Event {
  id: number;
  name: string;
  organizer: string;
  price: string;
  totalTickets: number;
  availableTickets: number;
  metadataCid: string;
  active: boolean;
  cancelled: boolean;
  completed: boolean;
}

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { contract, api, selectedAccount, isConnected } = usePolkadot();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ticketIdToUse, setTicketIdToUse] = useState("");
  const [showUseTicketModal, setShowUseTicketModal] = useState(false);

  useEffect(() => {
    if (contract && api && id) {
      loadEvent();
    }
  }, [contract, api, id]);

  const loadEvent = async () => {
    if (!contract || !api || !id) return;

    try {
      setLoading(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 3000000000n,
        proofSize: 1000000n,
      }) as any;

      // Get event details (camelCase as Polkadot.js converts it)
      const { result, output } = await contract.query.getEvent(
        contract.address.toString(),
        { gasLimit, storageDepositLimit: null },
        parseInt(id)
      );

      if (result.isOk && output) {
        const eventData = output.toHuman() as any;
        if (eventData.Ok) {
          setEvent({
            id: parseInt(id),
            name: eventData.Ok.name,
            organizer: eventData.Ok.organizer,
            price: eventData.Ok.price,
            totalTickets: eventData.Ok.totalTickets,
            availableTickets: eventData.Ok.availableTickets,
            metadataCid: eventData.Ok.metadataCid,
            active:
              eventData.Ok.active === true || eventData.Ok.active === "true",
            cancelled:
              eventData.Ok.cancelled === true ||
              eventData.Ok.cancelled === "true",
            completed:
              eventData.Ok.completed === true ||
              eventData.Ok.completed === "true",
          });
        }
      }
    } catch (error) {
      toast.error("Failed to load event");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTicket = async () => {
    if (!isConnected || !selectedAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!contract || !api || !event) {
      toast.error("Contract not initialized");
      return;
    }

    if (event.availableTickets === 0) {
      toast.error("Event sold out!");
      return;
    }

    // Show confirmation with exact price
    const priceInUnits = fromSmallestUnit(event.price);
    if (
      !window.confirm(
        `Confirm ticket purchase for exactly ${priceInUnits} Unit?\n\nNote: You must pay the exact amount. Overpayment or underpayment will fail.`
      )
    ) {
      return;
    }

    try {
      setPurchasing(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 10000000000n,
        proofSize: 1000000n,
      }) as any;

      const injector = await web3FromAddress(selectedAccount.address);

      // Convert price string to BigInt (remove commas and parse)
      // IMPORTANT: Must send EXACT price amount
      const priceValue = BigInt(event.price.replace(/,/g, ""));

      // Call buyTicket with exact payment amount (camelCase as Polkadot.js converts it)
      const tx = await contract.tx.buyTicket(
        {
          gasLimit,
          storageDepositLimit: null,
          value: priceValue, // Send EXACT payment amount
        },
        event.id
      );

      await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status, events }) => {
          if (status.isInBlock) {
            toast.info("Transaction included in block");
          } else if (status.isFinalized) {
            // Check for contract errors in events
            const failed = events?.find((e) =>
              api.events.system.ExtrinsicFailed.is(e.event)
            );
            if (failed) {
              toast.error(
                "Transaction failed. Please check payment amount matches ticket price exactly."
              );
              return;
            }
            toast.success("Ticket purchased successfully! 🎉");
            navigate("/my-tickets");
          }
        }
      );
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || "";
      if (
        errorMsg.includes("InsufficientPayment") ||
        errorMsg.includes("payment")
      ) {
        toast.error("Payment amount must exactly match ticket price!");
      } else if (errorMsg.includes("SoldOut")) {
        toast.error("Event sold out!");
      } else if (errorMsg.includes("EventNotActive")) {
        toast.error("Event is not active!");
      } else {
        toast.error("Failed to purchase ticket. Please try again.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!contract || !api || !selectedAccount || !event) return;

    if (
      !window.confirm(
        "Are you sure you want to cancel this event? All ticket holders will be eligible for refunds."
      )
    ) {
      return;
    }

    try {
      setProcessing(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 10000000000n,
        proofSize: 1000000n,
      }) as any;

      const injector = await web3FromAddress(selectedAccount.address);

      // Use camelCase function name as Polkadot.js converts it
      const tx = await contract.tx.cancelEvent(
        { gasLimit, storageDepositLimit: null },
        event.id
      );

      await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isFinalized) {
            toast.success("Event cancelled successfully!");
            loadEvent();
          }
        }
      );
    } catch (error) {
      toast.error("Failed to cancel event");
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteEvent = async () => {
    if (!contract || !api || !selectedAccount || !event) return;

    if (
      !window.confirm("Are you sure you want to mark this event as completed?")
    ) {
      return;
    }

    try {
      setProcessing(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 10000000000n,
        proofSize: 1000000n,
      }) as any;

      const injector = await web3FromAddress(selectedAccount.address);

      // Use camelCase function name as Polkadot.js converts it
      const tx = await contract.tx.completeEvent(
        { gasLimit, storageDepositLimit: null },
        event.id
      );

      await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isFinalized) {
            toast.success("Event marked as completed!");
            loadEvent();
          }
        }
      );
    } catch (error) {
      toast.error("Failed to complete event");
    } finally {
      setProcessing(false);
    }
  };

  const handleUseTicket = async () => {
    if (!contract || !api || !selectedAccount || !ticketIdToUse) return;

    try {
      setProcessing(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 10000000000n,
        proofSize: 1000000n,
      }) as any;

      const injector = await web3FromAddress(selectedAccount.address);

      // Use camelCase function name as Polkadot.js converts it
      const tx = await contract.tx.useTicket(
        { gasLimit, storageDepositLimit: null },
        parseInt(ticketIdToUse)
      );

      await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isFinalized) {
            toast.success("Ticket validated successfully!");
            setShowUseTicketModal(false);
            setTicketIdToUse("");
          }
        }
      );
    } catch (error) {
      toast.error("Failed to validate ticket");
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdrawEarnings = async () => {
    if (!contract || !api || !selectedAccount || !event) return;

    if (!window.confirm("Withdraw earnings from this completed event?")) {
      return;
    }

    try {
      setProcessing(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 10000000000n,
        proofSize: 1000000n,
      }) as any;

      const injector = await web3FromAddress(selectedAccount.address);

      const tx = await contract.tx.withdrawEarnings(
        { gasLimit, storageDepositLimit: null },
        event.id
      );

      await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isFinalized) {
            toast.success("Earnings withdrawn successfully! 💰");
            loadEvent();
          }
        }
      );
    } catch (error) {
      toast.error("Failed to withdraw earnings");
    } finally {
      setProcessing(false);
    }
  };

  const isOrganizer =
    selectedAccount && event && selectedAccount.address === event.organizer;

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-white mt-4">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-white text-xl">Event not found</p>
      </div>
    );
  }

  const soldPercentage =
    ((event.totalTickets - event.availableTickets) / event.totalTickets) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/")}
        className="mb-6 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
      >
        ← Back to Events
      </button>

      <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg overflow-hidden border border-purple-500">
        <div className="h-64 bg-linear-to-br from-purple-600 to-pink-600 flex items-center justify-center">
          <span className="text-9xl">🎭</span>
        </div>

        <div className="p-8">
          <h1 className="text-4xl font-bold text-white mb-6">{event.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 bg-opacity-50 p-6 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-2">Ticket Price</h3>
              <p className="text-3xl font-bold text-green-400">
                {fromSmallestUnit(event.price)} Unit
              </p>
            </div>

            <div className="bg-gray-900 bg-opacity-50 p-6 rounded-lg">
              <h3 className="text-gray-400 text-sm mb-2">Availability</h3>
              <p className="text-3xl font-bold text-white">
                {event.availableTickets} / {event.totalTickets}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-gray-300 mb-2">
              <span>Tickets Sold</span>
              <span>{soldPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-linear-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${soldPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-900 bg-opacity-50 p-6 rounded-lg mb-8">
            <h3 className="text-white font-semibold mb-2">Event Details</h3>
            <p className="text-gray-300 mb-4">
              Experience an amazing event secured by blockchain technology. Each
              ticket is a unique NFT that proves your ownership and prevents
              fraud.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Organizer:</span>
                <p className="text-white font-mono text-xs break-all">
                  {event.organizer}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Metadata CID:</span>
                <p className="text-white font-mono text-xs">
                  {event.metadataCid}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <p className="text-white font-semibold">
                  {event.cancelled ? (
                    <span className="text-red-400">❌ Cancelled</span>
                  ) : event.completed ? (
                    <span className="text-blue-400">✅ Completed</span>
                  ) : event.active ? (
                    <span className="text-green-400">🟢 Active</span>
                  ) : (
                    <span className="text-gray-400">⚪ Inactive</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Event ID:</span>
                <p className="text-white font-semibold">#{event.id}</p>
              </div>
            </div>
          </div>

          {/* Organizer Controls */}
          {isOrganizer && (
            <div className="bg-linear-to-r from-yellow-900 to-orange-900 bg-opacity-50 p-6 rounded-lg mb-8 border border-yellow-500">
              <h3 className="text-yellow-300 font-semibold mb-4 flex items-center">
                <span className="mr-2">👑</span>
                Organizer Controls
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setShowUseTicketModal(true)}
                  disabled={processing || event.cancelled || event.completed}
                  className="py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
                >
                  Validate Ticket
                </button>
                <button
                  onClick={handleCompleteEvent}
                  disabled={processing || event.cancelled || event.completed}
                  className="py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
                >
                  Complete Event
                </button>
                <button
                  onClick={handleCancelEvent}
                  disabled={processing || event.cancelled || event.completed}
                  className="py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
                >
                  Cancel Event
                </button>
              </div>
              {event.completed && (
                <div className="mt-3">
                  <button
                    onClick={handleWithdrawEarnings}
                    disabled={processing}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <span>💰</span>
                    Withdraw Earnings
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Buy Ticket Button */}
          {!isOrganizer && (
            <>
              {/* Payment Warning */}
              {!event.cancelled &&
                !event.completed &&
                event.active &&
                event.availableTickets > 0 && (
                  <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4 mb-4">
                    <p className="text-blue-300 text-sm">
                      ⚠️ <strong>Important:</strong> You must pay exactly{" "}
                      <strong>{fromSmallestUnit(event.price)} Unit</strong> for
                      this ticket. Overpayment or underpayment will cause the
                      transaction to fail.
                    </p>
                  </div>
                )}

              <button
                onClick={handleBuyTicket}
                disabled={
                  purchasing ||
                  !event.active ||
                  event.cancelled ||
                  event.completed ||
                  event.availableTickets === 0
                }
                className="w-full py-4 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-xl rounded-lg transition"
              >
                {purchasing
                  ? "Processing..."
                  : event.cancelled
                  ? "Event Cancelled"
                  : event.completed
                  ? "Event Completed"
                  : event.availableTickets === 0
                  ? "Sold Out"
                  : `Buy Ticket - ${fromSmallestUnit(
                      event.price
                    )} Unit (Exact Amount)`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Use Ticket Modal */}
      {showUseTicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-purple-500">
            <h3 className="text-2xl font-bold text-white mb-4">
              Validate Ticket
            </h3>
            <p className="text-gray-300 mb-4">
              Enter the ticket ID to mark it as used for event #{event.id}
            </p>
            <input
              type="number"
              value={ticketIdToUse}
              onChange={(e) => setTicketIdToUse(e.target.value)}
              placeholder="Ticket ID"
              className="w-full px-4 py-3 bg-gray-900 text-white border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowUseTicketModal(false);
                  setTicketIdToUse("");
                }}
                disabled={processing}
                className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUseTicket}
                disabled={processing || !ticketIdToUse}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
              >
                {processing ? "Validating..." : "Validate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
