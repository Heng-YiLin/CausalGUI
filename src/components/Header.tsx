import React from "react";
import {Button, Menu, MenuProps} from "antd";
import { AppstoreOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons';
import { BrowserRouter as Router,Route,Routes,NavLink } from "react-router";
import DDM from "./DDM"
import App from "../App";
interface HeaderProps {
  brandText?: string; // Optional prop, define as needed
}
type MenuItem = Required<MenuProps>['items'][number];

const nodes = JSON.parse(localStorage.getItem("cld-nodes") || "[]");

const downloadNodesAsJSON = () => {
  const dataStr = JSON.stringify(nodes, null, 2); // Pretty-print with indentation
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "nodes.json";
  a.click();

  URL.revokeObjectURL(url);
};


const items: MenuItem[] = [
  {
   label: (
      <NavLink to="/">
Home      </NavLink>
    ),
    key: 'mail',
    icon: <AppstoreOutlined />,
  },
  {
    label: (
      <NavLink to="/DDM">
        Direct Depedency Matrix
      </NavLink>
    ),
    key: 'app',
    icon: <AppstoreOutlined />,
  },
    {
    label: (
      <NavLink to="/DDM">
        Factor Class Graph
      </NavLink>
    ),
    key: 'app',
    icon: <AppstoreOutlined />,
  },
  {
    label: (
      <Button type="primary" size="small" onClick={downloadNodesAsJSON}>
        Download
      </Button>
    ),
    key: 'download-button',
    disabled: true, // Prevents it from acting as a selectable menu item
  },
];

const Header: React.FC<HeaderProps> = () => {
  return (
    <div>
       <Menu  mode="horizontal" items={items} />

       <Routes>
        <Route path="/" element={<App />} />
        <Route path="/DDM" element={<DDM />} />
       </Routes>

    </div>


  
  );
};

export default Header;
