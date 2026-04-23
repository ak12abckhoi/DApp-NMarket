import { Link, NavLink } from "react-router-dom";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { oasisSapphireTestnet } from "@/config/web3";

export default function Navbar() {
  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();
  const { disconnect }           = useDisconnect();
  const chainId                  = useChainId();
  const { switchChain }          = useSwitchChain();

  const short      = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const wrongChain = isConnected && chainId !== oasisSapphireTestnet.id;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur border-b border-gray-800">
      {wrongChain && (
        <div className="bg-red-600/90 text-white text-xs text-center py-1.5 flex items-center justify-center gap-3">
          <span>Wrong network — please switch to Oasis Sapphire Testnet</span>
          <button
            onClick={() => switchChain({ chainId: oasisSapphireTestnet.id })}
            className="underline font-semibold hover:text-red-200 transition-colors"
          >
            Switch now
          </button>
        </div>
      )}

      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="font-bold text-xl text-white tracking-tight">
          NFT<span className="text-purple-400">Market</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { to: "/",     label: "Explore" },
            { to: "/mint", label: "Mint NFT" },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-gray-400 hover:text-white"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          {isConnected && (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-gray-400 hover:text-white"
                }`
              }
            >
              My Collection
            </NavLink>
          )}
        </div>

        {/* Wallet */}
        {isConnected ? (
          <div className="flex items-center gap-3">
            {/* Network badge */}
            <span className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
              wrongChain
                ? "bg-red-500/10 border-red-500/40 text-red-400"
                : "bg-green-500/10 border-green-500/30 text-green-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wrongChain ? "bg-red-400" : "bg-green-400 animate-pulse"}`} />
              {wrongChain ? "Wrong Network" : "Sapphire Testnet"}
            </span>

            <Link
              to="/profile"
              className="text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg font-mono transition-colors"
            >
              {short(address!)}
            </Link>
            <button
              onClick={() => disconnect()}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Connect Wallet
          </button>
        )}

      </div>
    </nav>
  );
}
