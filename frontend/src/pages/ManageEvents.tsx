import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePolkadot } from "../contexts/PolkadotContext";
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

const ManageEvents = () => {
  const { contract, api, selectedAccount, isConnected } = usePolkadot();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contract && api && selectedAccount) {
      loadMyEvents();
    }
  }, [contract, api, selectedAccount]);

  const loadMyEvents = async () => {
    if (!contract || !api || !selectedAccount) return;

    try {
      setLoading(true);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 3000000000n,
        proofSize: 1000000n,
      }) as any;

      // Get total event count
      const { result, output } = await contract.query.getEventCount(
        contract.address.toString(),
        { gasLimit, storageDepositLimit: null }
      );

      if (result.isOk && output) {
        const rawOutput = output.toHuman();

        let eventCount = 0;
        if (typeof rawOutput === "object" && rawOutput !== null) {
          if ("Ok" in rawOutput) {
            eventCount = Number((rawOutput as any).Ok.replace(/,/g, ""));
          } else {
            eventCount = Number(rawOutput);
          }
        } else {
          eventCount = Number(rawOutput);
        }

        // Load events created by current user
        const myEvents: Event[] = [];
        for (let i = 0; i < eventCount; i++) {
          const { result: eventResult, output: eventOutput } =
            await contract.query.getEvent(
              contract.address.toString(),
              { gasLimit, storageDepositLimit: null },
              i
            );

          if (eventResult.isOk && eventOutput) {
            const eventData = eventOutput.toHuman() as any;

            if (eventData && eventData.Ok) {
              const event = eventData.Ok;
              // Only include events organized by current user
              if (event.organizer === selectedAccount.address) {
                myEvents.push({
                  id: i,
                  name: event.name || "",
                  organizer: event.organizer || "",
                  price: event.price ? event.price.replace(/,/g, "") : "0",
                  totalTickets: Number(event.totalTickets) || 0,
                  availableTickets: Number(event.availableTickets) || 0,
                  metadataCid: event.metadataCid || "",
                  active: event.active === true || event.active === "true",
                  cancelled:
                    event.cancelled === true || event.cancelled === "true",
                  completed:
                    event.completed === true || event.completed === "true",
                });
              }
            }
          }
        }

        setEvents(myEvents);
      }
    } catch (error) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-white text-xl">
          Please connect your wallet to manage your events
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-300 mt-4">Loading your events...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">My Events</h1>
        <Link
          to="/create-event"
          className="px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition"
        >
          + Create New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 bg-opacity-50 rounded-lg border border-purple-500">
          <span className="text-6xl mb-4 block">🎭</span>
          <p className="text-gray-300 text-xl mb-4">
            You haven't created any events yet
          </p>
          <p className="text-gray-400 mb-6">
            Start organizing amazing blockchain-secured events!
          </p>
          <Link
            to="/create-event"
            className="inline-block px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition"
          >
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const soldPercentage =
              ((event.totalTickets - event.availableTickets) /
                event.totalTickets) *
              100;

            return (
              <Link
                key={event.id}
                to={`/event/${event.id}`}
                className="block bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 border border-purple-500 hover:border-purple-400 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-white">
                        {event.name}
                      </h3>
                      {event.cancelled ? (
                        <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full">
                          Cancelled
                        </span>
                      ) : event.completed ? (
                        <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                          Completed
                        </span>
                      ) : event.active ? (
                        <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-600 text-white text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-3">
                      Event ID: #{event.id}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-gray-400 text-xs">Price</p>
                        <p className="text-green-400 font-semibold">
                          {fromSmallestUnit(event.price)} Unit
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Total Tickets</p>
                        <p className="text-white font-semibold">
                          {event.totalTickets}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Sold</p>
                        <p className="text-purple-400 font-semibold">
                          {event.totalTickets - event.availableTickets}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Available</p>
                        <p className="text-blue-400 font-semibold">
                          {event.availableTickets}
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-linear-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${soldPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">
                      {soldPercentage.toFixed(1)}% tickets sold
                    </p>
                  </div>

                  <div className="flex md:flex-col gap-2">
                    <div className="px-4 py-2 bg-purple-600 bg-opacity-20 border border-purple-500 rounded-lg text-center">
                      <p className="text-purple-300 text-xs">Revenue</p>
                      <p className="text-white font-bold">
                        {fromSmallestUnit(
                          BigInt(event.price.replace(/,/g, "")) *
                            BigInt(event.totalTickets - event.availableTickets)
                        )}{" "}
                        Unit
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManageEvents;
