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
}

const Home = () => {
  const { contract, api } = usePolkadot();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contract && api) {
      loadEvents();
    }
  }, [contract, api]);

  const loadEvents = async () => {
    if (!contract || !api) return;

    try {
      setLoading(true);

      // Get total event count
      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 3000000000n,
        proofSize: 1000000n,
      }) as any;

      // Use contract address as caller for read-only queries
      const { result, output } = await contract.query.getEventCount(
        contract.address.toString(),
        { gasLimit, storageDepositLimit: null }
      );

      if (result.isOk && output) {
        const rawOutput = output.toHuman();

        // Handle different response formats
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

        // Load each event
        const loadedEvents: Event[] = [];
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
              loadedEvents.push({
                id: i,
                name: event.name || "",
                organizer: event.organizer || "",
                price: event.price ? event.price.replace(/,/g, "") : "0",
                totalTickets: Number(event.totalTickets) || 0,
                availableTickets: Number(event.availableTickets) || 0,
                metadataCid: event.metadataCid || "",
                active: event.active === true || event.active === "true",
              });
            }
          }
        }

        setEvents(loadedEvents);
      }
    } catch (error) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-300 mt-4">Loading events...</p>
      </div>
    );
  }

  if (!contract || !api) {
    return (
      <div className="text-center py-20">
        <h2 className="text-4xl font-bold text-white mb-4">
          Welcome to TicketDot
        </h2>
        <p className="text-gray-300 mb-8">Connecting to blockchain...</p>
        <img
          src="/TicketDot_Icon_Light.png"
          alt="TicketDot"
          className="w-24 h-24 mx-auto mb-4 animate-pulse"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">Discover Events</h1>
        <p className="text-gray-300 text-lg">
          Secure, blockchain-verified tickets for every occasion
        </p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 bg-opacity-50 rounded-lg">
          <p className="text-gray-300 text-xl mb-4">No events found</p>
          <Link
            to="/create-event"
            className="inline-block px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition"
          >
            Create First Event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/event/${event.id}`}
              className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg overflow-hidden card-hover border border-purple-500"
            >
              <div className="h-48 bg-linear-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <span className="text-8xl">🎭</span>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {event.name}
                </h3>
                <div className="space-y-2 text-gray-300">
                  <p className="flex items-center justify-between">
                    <span>Price:</span>
                    <span className="font-semibold text-green-400">
                      {fromSmallestUnit(event.price)} Unit
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Available:</span>
                    <span className="font-semibold">
                      {event.availableTickets} / {event.totalTickets}
                    </span>
                  </p>
                  <div className="pt-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-linear-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                        style={{
                          width: `${
                            ((event.totalTickets - event.availableTickets) /
                              event.totalTickets) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
