import CLD from "./components/CLD";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import About from "./components/DDM";
import Contact from "./components/FactorClassGraph";

export default function App() {
  return (
    <Router>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header />
        <div style={{ flex: 1, minHeight: 0 }}>
          <Routes>
            <Route path="/" element={<CLD />} />
            <Route path="/DDM" element={<About />} />
            <Route path="/FactorClassGraph" element={<Contact />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
