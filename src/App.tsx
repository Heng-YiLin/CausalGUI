import CLD from "./components/CLD";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header"; // Adjust the path accordingly
import About from "./components/DDM";
import Contact from "./components/FactorClassGraph";

export default function App() {
  return (
    <Router>
      <Header /> 
      <Routes>
        <Route path="/" element={<CLD />} />
        <Route path="/DDM" element={<About />} />
        <Route path="/FactorClassGraph" element={<Contact />} />
      </Routes>
    </Router>
  );
}
