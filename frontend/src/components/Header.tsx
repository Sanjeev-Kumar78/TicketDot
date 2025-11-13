import { Link } from "react-router-dom";
import { usePolkadot } from "../contexts/PolkadotContext";

const Header = () => {
  const {
    selectedAccount,
    isConnected,
    connectWallet,
    accounts,
    selectAccount,
  } = usePolkadot();

  return (
    <header className="bg-gray-900 bg-opacity-90 backdrop-blur-sm border-b border-purple-500">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img
              src="/TicketDot_Icon_Light.png"
              alt="TicketDot Logo"
              className="h-10 w-10 object-contain"
            />
            <span className="text-2xl font-bold bg-linear-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TicketDot
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-300 hover:text-white transition">
              Events
            </Link>
            <Link
              to="/create-event"
              className="text-gray-300 hover:text-white transition"
            >
              Create Event
            </Link>
            <Link
              to="/manage-events"
              className="text-gray-300 hover:text-white transition"
            >
              Manage Events
            </Link>
            <Link
              to="/my-tickets"
              className="text-gray-300 hover:text-white transition"
            >
              My Tickets
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="px-6 py-2 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                {accounts.length > 1 && (
                  <select
                    value={selectedAccount?.address}
                    onChange={(e) => {
                      const account = accounts.find(
                        (acc) => acc.address === e.target.value
                      );
                      if (account) selectAccount(account);
                    }}
                    className="px-3 py-2 bg-gray-800 text-white rounded-lg border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {accounts.map((account) => (
                      <option key={account.address} value={account.address}>
                        {account.meta.name} - {account.address.slice(0, 6)}...
                        {account.address.slice(-4)}
                      </option>
                    ))}
                  </select>
                )}
                <div className="px-4 py-2 bg-green-600 bg-opacity-20 border border-green-500 rounded-lg">
                  <span className="text-green-400 text-sm font-medium">
                    {selectedAccount?.meta.name || "Connected"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
