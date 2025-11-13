import { useState, useEffect } from "react";
import { usePolkadot } from "../contexts/PolkadotContext";
import { web3FromAddress } from "@polkadot/extension-dapp";
import { toast } from "react-toastify";

interface Ticket {
  id: number;
  eventId: number;
  owner: string;
  purchaseTime: number;
  isUsed: boolean;
  isRefunded: boolean;
  eventName?: string;
  eventCancelled?: boolean;
}

const MyTickets = () => {
  const { contract, api, selectedAccount, isConnected } = usePolkadot();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [transferAddress, setTransferAddress] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (contract && api && selectedAccount) {
      loadMyTickets();
    }
  }, [contract, api, selectedAccount]);

  const loadMyTickets = async () => {
    if (!contract || !api || !selectedAccount) return;

    try {
      setLoading(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 3000000000n,
        proofSize: 1000000n,
      }) as any;

      // Get user's ticket IDs
      const { result, output } = await contract.query.getMyTickets(
        selectedAccount.address,
        { gasLimit, storageDepositLimit: null },
        selectedAccount.address
      );

      if (result.isOk && output) {
        const rawOutput = output.toHuman() as any;

        // Parse ticket IDs - handle different response formats
        let ticketIds: any[] = [];
        if (rawOutput && typeof rawOutput === "object") {
          if ("Ok" in rawOutput) {
            ticketIds = rawOutput.Ok || [];
          } else if (Array.isArray(rawOutput)) {
            ticketIds = rawOutput;
          }
        } else if (Array.isArray(rawOutput)) {
          ticketIds = rawOutput;
        }

        // Load each ticket's details
        const loadedTickets: Ticket[] = [];
        for (const ticketId of ticketIds) {
          const parsedTicketId =
            typeof ticketId === "string"
              ? parseInt(ticketId.replace(/,/g, ""))
              : ticketId;

          const { result: ticketResult, output: ticketOutput } =
            await contract.query.getTicket(
              selectedAccount.address,
              { gasLimit, storageDepositLimit: null },
              parsedTicketId
            );

          if (ticketResult.isOk && ticketOutput) {
            const ticketData = ticketOutput.toHuman() as any;
            if (ticketData && ticketData.Ok) {
              const ticket = ticketData.Ok;

              // Get event details for this ticket
              const eventId =
                typeof ticket.eventId === "string"
                  ? parseInt(ticket.eventId.replace(/,/g, ""))
                  : ticket.eventId;

              const { result: eventResult, output: eventOutput } =
                await contract.query.getEvent(
                  selectedAccount.address,
                  { gasLimit, storageDepositLimit: null },
                  eventId
                );

              let eventName = "Unknown Event";
              let eventCancelled = false;
              if (eventResult.isOk && eventOutput) {
                const eventData = eventOutput.toHuman() as any;
                if (eventData && eventData.Ok) {
                  eventName = eventData.Ok.name;
                  eventCancelled =
                    eventData.Ok.cancelled === true ||
                    eventData.Ok.cancelled === "true";
                }
              }

              // Parse purchaseTime - remove commas and convert to number
              const purchaseTimeStr =
                typeof ticket.purchaseTime === "string"
                  ? ticket.purchaseTime.replace(/,/g, "")
                  : ticket.purchaseTime.toString();
              const purchaseTimeNum = parseInt(purchaseTimeStr);

              loadedTickets.push({
                id: parsedTicketId,
                eventId: eventId,
                owner: ticket.owner,
                purchaseTime: purchaseTimeNum,
                isUsed: ticket.isUsed === true || ticket.isUsed === "true",
                isRefunded:
                  ticket.isRefunded === true || ticket.isRefunded === "true",
                eventName,
                eventCancelled,
              });
            }
          }
        }

        setTickets(loadedTickets);
      }
    } catch (error) {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferTicket = async () => {
    if (!contract || !api || !selectedAccount || selectedTicketId === null)
      return;

    if (!transferAddress || transferAddress.trim() === "") {
      toast.error("Please enter a valid address");
      return;
    }

    try {
      setProcessing(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 10000000000n,
        proofSize: 1000000n,
      }) as any;

      const injector = await web3FromAddress(selectedAccount.address);

      const tx = await contract.tx.transferTicket(
        { gasLimit, storageDepositLimit: null },
        selectedTicketId,
        transferAddress
      );

      await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isFinalized) {
            toast.success("Ticket transferred successfully!");
            setTransferModalOpen(false);
            setTransferAddress("");
            setSelectedTicketId(null);
            loadMyTickets();
          }
        }
      );
    } catch (error) {
      toast.error("Failed to transfer ticket");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelTicket = async (ticketId: number) => {
    if (!contract || !api || !selectedAccount) return;

    if (
      !window.confirm(
        "Are you sure you want to cancel this ticket? You will receive a refund."
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

      const tx = await contract.tx.cancelTicket(
        { gasLimit, storageDepositLimit: null },
        ticketId
      );

      await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isFinalized) {
            toast.success("Ticket cancelled and refunded!");
            loadMyTickets();
          }
        }
      );
    } catch (error) {
      toast.error("Failed to cancel ticket");
    } finally {
      setProcessing(false);
    }
  };

  const handleRefundTicket = async (ticketId: number) => {
    if (!contract || !api || !selectedAccount) return;

    try {
      setProcessing(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 10000000000n,
        proofSize: 1000000n,
      }) as any;

      const injector = await web3FromAddress(selectedAccount.address);

      const tx = await contract.tx.refundTicket(
        { gasLimit, storageDepositLimit: null },
        ticketId
      );

      await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isFinalized) {
            toast.success("Ticket refunded successfully!");
            loadMyTickets();
          }
        }
      );
    } catch (error) {
      toast.error("Failed to refund ticket");
    } finally {
      setProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-white text-xl">
          Please connect your wallet to view your tickets
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-white mt-4">Loading your tickets...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-8 text-center">
        My Tickets
      </h1>

      {tickets.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 bg-opacity-50 rounded-lg border border-purple-500">
          <img
            src="/TicketDot_Icon_Light.png"
            alt="No Tickets"
            className="w-24 h-24 mx-auto mb-4 opacity-50"
          />
          <p className="text-gray-300 text-xl mb-4">
            You don't have any tickets yet
          </p>
          <p className="text-gray-400 mb-6">
            Browse events and purchase your first blockchain ticket!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-linear-to-br from-purple-900 to-pink-900 rounded-lg overflow-hidden border-2 border-purple-400 shadow-lg"
            >
              <div className="bg-black bg-opacity-30 p-4 border-b border-purple-400">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {ticket.eventName}
                    </h3>
                    <p className="text-purple-300 text-sm">
                      Ticket #{ticket.id}
                    </p>
                  </div>
                  {ticket.isRefunded ? (
                    <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full">
                      Cancelled
                    </span>
                  ) : ticket.eventCancelled ? (
                    <span className="px-3 py-1 bg-orange-600 text-white text-xs rounded-full">
                      Event Cancelled
                    </span>
                  ) : ticket.isUsed ? (
                    <span className="px-3 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                      Used
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                      Valid
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-300">Event ID:</span>
                    <span className="text-white font-semibold">
                      {ticket.eventId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-300">Purchase Time:</span>
                    <span className="text-white font-semibold">
                      {new Date(ticket.purchaseTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-300">Status:</span>
                    <span
                      className={
                        ticket.isRefunded
                          ? "text-red-400"
                          : ticket.eventCancelled
                          ? "text-orange-400"
                          : ticket.isUsed
                          ? "text-gray-400"
                          : "text-green-400"
                      }
                    >
                      {ticket.isRefunded
                        ? "Cancelled/Refunded"
                        : ticket.eventCancelled
                        ? "Event Cancelled - Refund Available"
                        : ticket.isUsed
                        ? "Redeemed"
                        : "Active"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-black bg-opacity-40 rounded-lg">
                  <p className="text-purple-200 text-xs mb-2">Owner Address</p>
                  <p className="text-white text-xs font-mono break-all">
                    {ticket.owner}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  {ticket.eventCancelled && !ticket.isRefunded ? (
                    <button
                      onClick={() => handleRefundTicket(ticket.id)}
                      disabled={processing}
                      className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Claim Refund
                    </button>
                  ) : !ticket.isUsed &&
                    !ticket.isRefunded &&
                    !ticket.eventCancelled ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedTicketId(ticket.id);
                          setTransferModalOpen(true);
                        }}
                        disabled={processing}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-semibold transition"
                      >
                        Transfer Ticket
                      </button>
                      <button
                        onClick={() => handleCancelTicket(ticket.id)}
                        disabled={processing}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-semibold transition"
                      >
                        Cancel & Refund
                      </button>
                    </>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-center text-purple-300 text-xs">
                  <span className="mr-2">🔐</span>
                  <span>Secured by Polkadot</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-purple-500">
            <h3 className="text-2xl font-bold text-white mb-4">
              Transfer Ticket
            </h3>
            <p className="text-gray-300 mb-4">
              Enter the recipient's wallet address to transfer ticket #
              {selectedTicketId}
            </p>
            <input
              type="text"
              value={transferAddress}
              onChange={(e) => setTransferAddress(e.target.value)}
              placeholder="5ABC...XYZ (Polkadot Address)"
              className="w-full px-4 py-3 bg-gray-900 text-white border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setTransferModalOpen(false);
                  setTransferAddress("");
                  setSelectedTicketId(null);
                }}
                disabled={processing}
                className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferTicket}
                disabled={processing || !transferAddress}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
              >
                {processing ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
