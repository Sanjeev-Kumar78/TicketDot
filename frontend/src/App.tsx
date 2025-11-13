import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import CreateEvent from "./pages/CreateEvent";
import MyTickets from "./pages/MyTickets";
import EventDetails from "./pages/EventDetails";
import ManageEvents from "./pages/ManageEvents";

function App() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-violet-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/manage-events" element={<ManageEvents />} />
          <Route path="/event/:id" element={<EventDetails />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
