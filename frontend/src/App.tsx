import { Routes, Route } from "react-router-dom";
import Navbar from "@/components/ui/Navbar";
import MarketplacePage from "@/pages/MarketplacePage";
import NFTDetailPage from "@/pages/NFTDetailPage";
import MintPage from "@/pages/MintPage";
import ProfilePage from "@/pages/ProfilePage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 pb-12">
        <Routes>
          <Route path="/"              element={<MarketplacePage />} />
          <Route path="/nft/:id"       element={<NFTDetailPage />} />
          <Route path="/mint"          element={<MintPage />} />
          <Route path="/profile"       element={<ProfilePage />} />
          <Route path="/profile/:addr" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}