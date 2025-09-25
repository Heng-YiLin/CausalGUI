import Logo from "../assets/logo.png";
import { Link } from "react-router-dom";
import Export from "./Export";

const Header = ({ onImportJson }) => {
  return (
    <nav className="sticky top-0 z-30 w-full shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="text-2xl font-bold text-gray-900 sm:px-6">
            <Link to="/">
              <img src={Logo} alt="Logo" />
            </Link>
          </div>
          <div className="flex space-x-6">
            <Link to="/DDM">Direct Dependency Matrix</Link>
            <Link to="/PM">Polarity Matrix</Link>
            <Link to="/LoopID">Loops</Link>
            <Link to="/FactorClassGraph">Factor Class Graph</Link>
            <Link to ="/Export">Export</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
